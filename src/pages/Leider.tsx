import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// --- TYPES & INTERFACES ---

type Tab = 'dossiers' | 'taken' | 'todos' | 'vragen'

interface TeamMember {
  id: string
  name: string
}

interface Task {
  id: string
  title: string
  description?: string
  assigneeId?: string | null
  category: 'Accommodatie' | 'Transport' | 'Activiteiten' | 'Algemeen' | 'Administratie' | 'Voeding' | 'Communicatie'
  priority: 'Hoog' | 'Middel' | 'Laag'
  status: 'Te doen' | 'Mee bezig' | 'Klaar' | 'Geblokkeerd'
  dueDate?: string
  order?: number
  progress?: string
}

interface Todo {
  id: string
  title: string
  completed: boolean
  order?: number
  created_at?: string
}

interface Question {
  id: string
  question: string
  askedBy: string
  recipients: string[] // 'everyone' or array of member IDs
  created_at: string
  answers?: Answer[]
}

interface Answer {
  id: string
  question_id: string
  answer: string
  answeredBy: string
  created_at: string
}

interface FileLink {
  id: string
  name: string
  type: 'link' | 'file'
  url: string
  size?: number
}

// --- CONSTANTS ---

const TEAM_MEMBERS: TeamMember[] = [
  { id: 'louis', name: 'Louis' },
  { id: 'michiel', name: 'Michiel' },
  { id: 'tim', name: 'Tim' },
  { id: 'douwe', name: 'Douwe' },
  { id: 'victor', name: 'Victor' },
  { id: 'stan', name: 'Stan' },
]

// --- COMPONENT ---

export default function Leider() {
  const { name } = useParams<{ name: string }>()
  const [activeTab, setActiveTab] = useState<Tab>('dossiers')
  const [loading, setLoading] = useState(true)

  // Data
  const [notes, setNotes] = useState('')
  const [files, setFiles] = useState<FileLink[]>([])
  const [tasks, setTasks] = useState<Task[]>([])
  const [todos, setTodos] = useState<Todo[]>([])
  const [questions, setQuestions] = useState<Question[]>([])

  // Modals & UI state
  const [isTodoModalOpen, setIsTodoModalOpen] = useState(false)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false)
  const [isAnswerModalOpen, setIsAnswerModalOpen] = useState(false)
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null)
  const [linkInputState, setLinkInputState] = useState<{ name: string; url: string } | null>(null)
  const [recipientType, setRecipientType] = useState<'everyone' | 'specific'>('everyone')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentLeader = TEAM_MEMBERS.find(m => m.id === name?.toLowerCase())
  const leaderName = currentLeader?.name || name || 'Onbekend'

  // Load all data
  useEffect(() => {
    if (name) {
      loadAllData()
    }
  }, [name])

  const loadAllData = async () => {
    try {
      setLoading(true)
      await Promise.all([
        loadDossiers(),
        loadTasks(),
        loadTodos(),
        loadQuestions(),
      ])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadDossiers = async () => {
    if (!name) return
    try {
      const { data: space, error: spaceError } = await supabase
        .from('werkgroep_member_spaces')
        .select('*')
        .eq('member_id', name.toLowerCase())
        .single()

      if (spaceError && spaceError.code !== 'PGRST116') {
        console.error('Error loading space:', spaceError)
      }

      const { data: filesData, error: filesError } = await supabase
        .from('werkgroep_member_files')
        .select('*')
        .eq('member_id', name.toLowerCase())

      if (filesError) {
        console.error('Error loading files:', filesError)
      }

      setNotes(space?.notes || '')
      setFiles((filesData || []).map(f => ({
        id: f.id,
        name: f.name,
        type: f.type as 'link' | 'file',
        url: f.url,
        size: f.size || undefined,
      })))
    } catch (error) {
      console.error('Error loading dossiers:', error)
    }
  }

  const loadTasks = async () => {
    if (!name) return
    try {
      const { data, error } = await supabase
        .from('werkgroep_tasks')
        .select('*')
        .eq('assignee_id', name.toLowerCase())
        .order('order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (error) throw error

      if (data) {
        // Load progress notes
        const taskIds = data.map(t => t.id)
        const { data: progressData } = await supabase
          .from('leader_task_progress')
          .select('*')
          .in('task_id', taskIds)
          .eq('leader_id', name.toLowerCase())

        const progressMap = new Map(progressData?.map(p => [p.task_id, p.progress]) || [])

        const convertedTasks: Task[] = data.map(item => ({
          id: item.id,
          title: item.title,
          description: item.description || undefined,
          assigneeId: item.assignee_id || null,
          category: item.category as Task['category'],
          priority: item.priority as Task['priority'],
          status: item.status as Task['status'],
          dueDate: item.due_date || undefined,
          order: item.order || undefined,
          progress: progressMap.get(item.id) || undefined,
        }))
        setTasks(convertedTasks)
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
    }
  }

  const loadTodos = async () => {
    if (!name) return
    try {
      const { data, error } = await supabase
        .from('leader_todos')
        .select('*')
        .eq('leader_id', name.toLowerCase())
        .order('order', { ascending: true, nullsFirst: false })
        .order('created_at', { ascending: false })

      if (error) {
        // Table might not exist yet, that's ok
        if (error.code !== '42P01') {
          console.error('Error loading todos:', error)
        }
        return
      }

      if (data) {
        setTodos(data.map(item => ({
          id: item.id,
          title: item.title,
          completed: item.completed || false,
          order: item.order || undefined,
          created_at: item.created_at,
        })))
      }
    } catch (error) {
      console.error('Error loading todos:', error)
    }
  }

  const loadQuestions = async () => {
    if (!name) return
    try {
      // Load questions where this leader is recipient or asked by them
      const { data: questionsData, error: questionsError } = await supabase
        .from('leader_questions')
        .select('*')
        .order('created_at', { ascending: false })

      if (questionsError) {
        if (questionsError.code !== '42P01') {
          console.error('Error loading questions:', questionsError)
        }
        return
      }

      if (questionsData) {
        // Filter questions relevant to this leader
        const relevantQuestions = questionsData.filter(q => {
          const recipients = q.recipients || []
          return q.asked_by === name.toLowerCase() || 
                 recipients.includes('everyone') || 
                 recipients.includes(name.toLowerCase())
        })

        // Load answers for these questions
        const questionIds = relevantQuestions.map(q => q.id)
        const { data: answersData } = await supabase
          .from('leader_answers')
          .select('*')
          .in('question_id', questionIds)
          .order('created_at', { ascending: true })

        const answersMap = new Map<string, Answer[]>()
        answersData?.forEach(a => {
          if (!answersMap.has(a.question_id)) {
            answersMap.set(a.question_id, [])
          }
          answersMap.get(a.question_id)!.push({
            id: a.id,
            question_id: a.question_id,
            answer: a.answer,
            answeredBy: a.answered_by,
            created_at: a.created_at,
          })
        })

        const convertedQuestions: Question[] = relevantQuestions.map(q => ({
          id: q.id,
          question: q.question,
          askedBy: q.asked_by,
          recipients: q.recipients || [],
          created_at: q.created_at,
          answers: answersMap.get(q.id) || [],
        }))

        setQuestions(convertedQuestions)
      }
    } catch (error) {
      console.error('Error loading questions:', error)
    }
  }

  // Handlers
  const handleUpdateNotes = async (newNotes: string) => {
    if (!name) return
    setNotes(newNotes)
    try {
      await supabase
        .from('werkgroep_member_spaces')
        .upsert({
          member_id: name.toLowerCase(),
          notes: newNotes,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'member_id',
        })
    } catch (error) {
      console.error('Error updating notes:', error)
    }
  }

  const handleAddLink = async () => {
    if (!name || !linkInputState?.name || !linkInputState?.url) return

    try {
      const { data, error } = await supabase
        .from('werkgroep_member_files')
        .insert({
          member_id: name.toLowerCase(),
          name: linkInputState.name,
          type: 'link',
          url: linkInputState.url,
        })
        .select()
        .single()

      if (error) throw error

      const newFile: FileLink = {
        id: data.id,
        name: data.name,
        type: data.type as 'link' | 'file',
        url: data.url,
        size: data.size || undefined,
      }

      setFiles([...files, newFile])
      setLinkInputState(null)
    } catch (error) {
      console.error('Error adding link:', error)
      alert('Fout bij toevoegen van link')
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !name) return
    if (file.size > 3 * 1024 * 1024) {
      alert('Bestand is te groot (max 3MB).')
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const { data, error } = await supabase
          .from('werkgroep_member_files')
          .insert({
            member_id: name.toLowerCase(),
            name: file.name,
            type: 'file',
            url: event.target?.result as string,
            size: file.size,
          })
          .select()
          .single()

        if (error) throw error

        const newFile: FileLink = {
          id: data.id,
          name: data.name,
          type: data.type as 'link' | 'file',
          url: data.url,
          size: data.size || undefined,
        }

        setFiles([...files, newFile])
        if (fileInputRef.current) fileInputRef.current.value = ''
      } catch (error) {
        console.error('Error uploading file:', error)
        alert('Fout bij uploaden van bestand')
      }
    }
    reader.readAsDataURL(file)
  }

  const removeFile = async (fileId: string) => {
    if (!confirm('Ben je zeker?')) return

    try {
      const { error } = await supabase
        .from('werkgroep_member_files')
        .delete()
        .eq('id', fileId)

      if (error) throw error

      setFiles(files.filter(f => f.id !== fileId))
    } catch (error) {
      console.error('Error removing file:', error)
      alert('Fout bij verwijderen van bestand')
    }
  }

  const handleSaveTodo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!name) return
    const formData = new FormData(e.currentTarget)

    try {
      const todoData = {
        leader_id: name.toLowerCase(),
        title: formData.get('title') as string,
        completed: false,
        order: todos.length,
      }

      if (editingTodo) {
        const { error } = await supabase
          .from('leader_todos')
          .update({ ...todoData, updated_at: new Date().toISOString() })
          .eq('id', editingTodo.id)

        if (error) throw error

        setTodos(todos.map(t => t.id === editingTodo.id ? { ...t, ...todoData } : t))
      } else {
        const { data, error } = await supabase
          .from('leader_todos')
          .insert(todoData)
          .select()
          .single()

        if (error) throw error

        setTodos([...todos, { id: data.id, ...todoData, created_at: data.created_at }])
      }

      setIsTodoModalOpen(false)
      setEditingTodo(null)
    } catch (error) {
      console.error('Error saving todo:', error)
      alert('Fout bij opslaan van to-do')
    }
  }

  const handleToggleTodo = async (todoId: string) => {
    if (!name) return
    const todo = todos.find(t => t.id === todoId)
    if (!todo) return

    try {
      const { error } = await supabase
        .from('leader_todos')
        .update({ completed: !todo.completed, updated_at: new Date().toISOString() })
        .eq('id', todoId)

      if (error) throw error

      setTodos(todos.map(t => t.id === todoId ? { ...t, completed: !t.completed } : t))
    } catch (error) {
      console.error('Error toggling todo:', error)
    }
  }

  const handleDeleteTodo = async (todoId: string) => {
    if (!confirm('Ben je zeker?')) return

    try {
      const { error } = await supabase
        .from('leader_todos')
        .delete()
        .eq('id', todoId)

      if (error) throw error

      setTodos(todos.filter(t => t.id !== todoId))
      setIsTodoModalOpen(false)
    } catch (error) {
      console.error('Error deleting todo:', error)
      alert('Fout bij verwijderen van to-do')
    }
  }

  const handleSaveQuestion = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!name) return
    const formData = new FormData(e.currentTarget)

    try {
      const recipientTypeValue = formData.get('recipientType') as string
      let recipients: string[] = []
      
      if (recipientTypeValue === 'everyone') {
        recipients = ['everyone']
      } else if (recipientTypeValue === 'specific') {
        const selected = formData.getAll('recipients') as string[]
        if (selected.length === 0) {
          alert('Selecteer ten minste één persoon')
          return
        }
        recipients = selected
      }

      const { data, error } = await supabase
        .from('leader_questions')
        .insert({
          question: formData.get('question') as string,
          asked_by: name.toLowerCase(),
          recipients: recipients,
        })
        .select()
        .single()

      if (error) throw error

      setQuestions([{
        id: data.id,
        question: data.question,
        askedBy: data.asked_by,
        recipients: data.recipients || [],
        created_at: data.created_at,
        answers: [],
      }, ...questions])

      setIsQuestionModalOpen(false)
      setRecipientType('everyone')
    } catch (error) {
      console.error('Error saving question:', error)
      alert('Fout bij opslaan van vraag')
    }
  }

  const handleSaveAnswer = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!name || !selectedQuestion) return
    const formData = new FormData(e.currentTarget)

    try {
      const { data, error } = await supabase
        .from('leader_answers')
        .insert({
          question_id: selectedQuestion.id,
          answer: formData.get('answer') as string,
          answered_by: name.toLowerCase(),
        })
        .select()
        .single()

      if (error) throw error

      const newAnswer: Answer = {
        id: data.id,
        question_id: data.question_id,
        answer: data.answer,
        answeredBy: data.answered_by,
        created_at: data.created_at,
      }

      setQuestions(questions.map(q => 
        q.id === selectedQuestion.id 
          ? { ...q, answers: [...(q.answers || []), newAnswer] }
          : q
      ))

      setIsAnswerModalOpen(false)
      setSelectedQuestion(null)
    } catch (error) {
      console.error('Error saving answer:', error)
      alert('Fout bij opslaan van antwoord')
    }
  }

  const handleUpdateTaskProgress = async (taskId: string, progress: string) => {
    if (!name) return
    try {
      await supabase
        .from('leader_task_progress')
        .upsert({
          leader_id: name.toLowerCase(),
          task_id: taskId,
          progress: progress,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'leader_id,task_id',
        })

      setTasks(tasks.map(t => t.id === taskId ? { ...t, progress } : t))
    } catch (error) {
      console.error('Error updating task progress:', error)
    }
  }

  const handleReorderTasks = async (newOrder: string[]) => {
    if (!name) return
    try {
      // Update order for all tasks
      const updates = newOrder.map((taskId, index) => 
        supabase
          .from('werkgroep_tasks')
          .update({ order: index, updated_at: new Date().toISOString() })
          .eq('id', taskId)
      )

      await Promise.all(updates)

      // Update local state with new order
      const taskMap = new Map(tasks.map(t => [t.id, t]))
      const reorderedTasks = newOrder.map(id => taskMap.get(id)!).filter(Boolean)
      setTasks(reorderedTasks)
    } catch (error) {
      console.error('Error reordering tasks:', error)
    }
  }

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return ''
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'Klaar': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'Mee bezig': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400'
      case 'Geblokkeerd': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  const getPriorityColor = (prio: Task['priority']) => {
    switch (prio) {
      case 'Hoog': return 'text-red-600 bg-red-50 dark:bg-red-900/20 dark:text-red-400'
      case 'Middel': return 'text-orange-600 bg-orange-50 dark:bg-orange-900/20 dark:text-orange-400'
      case 'Laag': return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-400'
    }
  }

  // Render functions
  const renderDossiers = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary">notes</span>
          Notities
        </h3>
        <textarea
          value={notes}
          onChange={(e) => handleUpdateNotes(e.target.value)}
          className="w-full h-64 p-3 text-sm rounded-lg border bg-transparent focus:ring-2 focus:ring-primary/50 outline-none resize-none"
          placeholder="Jouw persoonlijke notities..."
        />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">folder</span>
            Documenten
          </h3>
          <div className="flex gap-2">
            <button
              onClick={() => setLinkInputState({ name: '', url: '' })}
              className="text-xs bg-gray-100 dark:bg-gray-700 px-3 py-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 font-bold"
            >
              + Link
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-xs bg-primary/10 text-primary px-3 py-1.5 rounded hover:bg-primary/20 font-bold"
            >
              + Bestand
            </button>
          </div>
        </div>

        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />

        {linkInputState && (
          <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border">
            <input
              autoFocus
              placeholder="Naam"
              className="w-full text-sm p-2 mb-2 rounded border bg-transparent"
              value={linkInputState.name}
              onChange={e => setLinkInputState({ ...linkInputState, name: e.target.value })}
            />
            <input
              placeholder="URL"
              className="w-full text-sm p-2 mb-2 rounded border bg-transparent"
              value={linkInputState.url}
              onChange={e => setLinkInputState({ ...linkInputState, url: e.target.value })}
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setLinkInputState(null)}
                className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              >
                Annuleren
              </button>
              <button
                onClick={handleAddLink}
                className="text-xs bg-primary text-white px-3 py-1.5 rounded font-bold"
              >
                Opslaan
              </button>
            </div>
          </div>
        )}

        <ul className="space-y-2">
          {files.map(file => (
            <li key={file.id} className="flex items-center justify-between p-3 rounded bg-gray-50 dark:bg-gray-700/50 border hover:border-primary/30 group">
              <a
                href={file.url}
                download={file.type === 'file' ? file.name : undefined}
                target="_blank"
                className="flex items-center gap-2 text-sm truncate flex-1 hover:text-primary"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {file.type === 'file' ? 'description' : 'link'}
                </span>
                <span className="truncate">{file.name}</span>
                {file.size && <span className="text-xs text-gray-400">{formatFileSize(file.size)}</span>}
              </a>
              <button
                onClick={() => removeFile(file.id)}
                className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </li>
          ))}
          {files.length === 0 && (
            <li className="text-center text-gray-400 py-8 text-sm">Geen documenten</li>
          )}
        </ul>
      </div>
    </div>
  )

  const renderTasks = () => {
    const sortedTasks = [...tasks].sort((a, b) => (a.order || 999) - (b.order || 999))

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-bold">Mijn Taken ({tasks.length})</h3>
        </div>

        <div className="space-y-3">
          {sortedTasks.length === 0 ? (
            <p className="text-center text-gray-400 py-8">Geen taken toegewezen</p>
          ) : (
            sortedTasks.map((task, index) => (
              <div
                key={task.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="flex flex-col gap-1 mt-1">
                    <button
                      onClick={() => {
                        if (index === 0) return
                        const newOrder = [
                          ...sortedTasks.slice(0, index - 1).map(t => t.id),
                          task.id,
                          sortedTasks[index - 1].id,
                          ...sortedTasks.slice(index + 1).map(t => t.id),
                        ]
                        handleReorderTasks(newOrder)
                      }}
                      disabled={index === 0}
                      className="text-gray-400 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Omhoog verplaatsen"
                    >
                      <span className="material-symbols-outlined text-[20px]">arrow_upward</span>
                    </button>
                    <button
                      onClick={() => {
                        if (index === sortedTasks.length - 1) return
                        const newOrder = [
                          ...sortedTasks.slice(0, index).map(t => t.id),
                          sortedTasks[index + 1].id,
                          task.id,
                          ...sortedTasks.slice(index + 2).map(t => t.id),
                        ]
                        handleReorderTasks(newOrder)
                      }}
                      disabled={index === sortedTasks.length - 1}
                      className="text-gray-400 hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Omlaag verplaatsen"
                    >
                      <span className="material-symbols-outlined text-[20px]">arrow_downward</span>
                    </button>
                  </div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-bold text-[#111418] dark:text-white">{task.title}</h4>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${getStatusColor(task.status)}`}>
                        {task.status}
                      </span>
                    </div>
                    {task.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{task.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
                      <span className="bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded">{task.category}</span>
                      {task.dueDate && <span>{new Date(task.dueDate).toLocaleDateString()}</span>}
                    </div>
                    <div className="mt-3">
                      <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">
                        Vooruitgang noteren
                      </label>
                      <textarea
                        value={task.progress || ''}
                        onChange={(e) => handleUpdateTaskProgress(task.id, e.target.value)}
                        placeholder="Noteer hier je vooruitgang..."
                        className="w-full p-2 text-sm rounded-lg border bg-transparent focus:ring-2 focus:ring-primary/50 outline-none resize-none"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    )
  }

  const renderTodos = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">To-dos ({todos.filter(t => !t.completed).length} open)</h3>
        <button
          onClick={() => { setEditingTodo(null); setIsTodoModalOpen(true); }}
          className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 font-bold shadow-sm"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Nieuwe To-do
        </button>
      </div>

      <div className="space-y-2">
        {todos.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Geen to-dos</p>
        ) : (
          todos.map(todo => (
            <div
              key={todo.id}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleToggleTodo(todo.id)}
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    todo.completed
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 hover:border-primary'
                  }`}
                >
                  {todo.completed && <span className="material-symbols-outlined text-sm font-bold">check</span>}
                </button>
                <span
                  className={`flex-1 ${todo.completed ? 'line-through text-gray-400' : 'text-[#111418] dark:text-white font-semibold'}`}
                >
                  {todo.title}
                </span>
                <button
                  onClick={() => { setEditingTodo(todo); setIsTodoModalOpen(true); }}
                  className="text-gray-400 hover:text-primary"
                >
                  <span className="material-symbols-outlined text-[18px]">edit</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )

  const renderVragen = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold">Vragen & Antwoorden</h3>
        <button
          onClick={() => {
            setRecipientType('everyone')
            setIsQuestionModalOpen(true)
          }}
          className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary/90 font-bold shadow-sm"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          Nieuwe Vraag
        </button>
      </div>

      <div className="space-y-4">
        {questions.length === 0 ? (
          <p className="text-center text-gray-400 py-8">Geen vragen</p>
        ) : (
          questions.map(question => {
            const askedByMember = TEAM_MEMBERS.find(m => m.id === question.askedBy)
            const isRecipient = question.recipients.includes('everyone') || 
                               question.recipients.includes(name?.toLowerCase() || '')
            const canAnswer = isRecipient && question.askedBy !== name?.toLowerCase()

            return (
              <div
                key={question.id}
                className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                        {askedByMember?.name.substring(0, 2) || '??'}
                      </div>
                      <div>
                        <p className="font-bold text-[#111418] dark:text-white">
                          {askedByMember?.name || question.askedBy}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(question.created_at).toLocaleDateString('nl-NL', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <p className="text-[#111418] dark:text-white mt-2">{question.question}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-gray-500">Aan:</span>
                      {question.recipients.includes('everyone') ? (
                        <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded">
                          Iedereen
                        </span>
                      ) : (
                        question.recipients.map(rid => {
                          const member = TEAM_MEMBERS.find(m => m.id === rid)
                          return member ? (
                            <span key={rid} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded">
                              {member.name}
                            </span>
                          ) : null
                        })
                      )}
                    </div>
                  </div>
                </div>

                {canAnswer && (
                  <button
                    onClick={() => { setSelectedQuestion(question); setIsAnswerModalOpen(true); }}
                    className="mb-4 text-sm text-primary hover:underline font-bold"
                  >
                    Antwoord geven
                  </button>
                )}

                {question.answers && question.answers.length > 0 && (
                  <div className="mt-4 space-y-3 border-t pt-4">
                    {question.answers.map(answer => {
                      const answeredByMember = TEAM_MEMBERS.find(m => m.id === answer.answeredBy)
                      return (
                        <div key={answer.id} className="flex items-start gap-3 pl-4 border-l-2 border-primary/30">
                          <div className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-600 dark:text-gray-400">
                            {answeredByMember?.name.substring(0, 2) || '??'}
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-bold text-gray-500 mb-1">
                              {answeredByMember?.name || answer.answeredBy}
                            </p>
                            <p className="text-sm text-[#111418] dark:text-white">{answer.answer}</p>
                            <p className="text-xs text-gray-400 mt-1">
                              {new Date(answer.created_at).toLocaleDateString('nl-NL', {
                                day: 'numeric',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-[#111418]">
        <div className="max-w-7xl mx-auto p-4 md:p-6 pt-16 md:pt-6">
          <p className="text-[#617589]">Data laden...</p>
        </div>
      </div>
    )
  }

  if (!currentLeader) {
    return (
      <div className="min-h-screen bg-gray-50/50 dark:bg-[#111418]">
        <div className="max-w-7xl mx-auto p-4 md:p-6 pt-16 md:pt-6">
          <p className="text-[#617589]">Leider niet gevonden</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-[#111418]">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8 pt-16 md:pt-6">
        <div className="flex justify-between items-end border-b pb-6">
          <div>
            <h1 className="text-4xl font-black text-[#111418] dark:text-white tracking-tight">
              {leaderName}
            </h1>
            <p className="text-[#617589] mt-1">Persoonlijke werkruimte</p>
          </div>
        </div>

        <div className="flex gap-6 border-b">
          {[
            { id: 'dossiers', label: 'Dossiers', icon: 'folder' },
            { id: 'taken', label: 'Mijn Taken', icon: 'task' },
            { id: 'todos', label: 'To-dos', icon: 'checklist' },
            { id: 'vragen', label: 'Vragen', icon: 'help' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2 pb-3 px-2 text-sm font-bold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
          {activeTab === 'dossiers' && renderDossiers()}
          {activeTab === 'taken' && renderTasks()}
          {activeTab === 'todos' && renderTodos()}
          {activeTab === 'vragen' && renderVragen()}
        </div>
      </div>

      {/* Todo Modal */}
      {isTodoModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <form onSubmit={handleSaveTodo}>
              <div className="p-6 border-b">
                <h3 className="text-xl font-bold">{editingTodo ? 'To-do Bewerken' : 'Nieuwe To-do'}</h3>
              </div>
              <div className="p-6 space-y-4">
                <input
                  name="title"
                  defaultValue={editingTodo?.title}
                  required
                  placeholder="Titel"
                  className="w-full p-2 rounded-lg border bg-transparent focus:ring-2 focus:ring-primary outline-none"
                />
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 flex justify-between items-center">
                {editingTodo ? (
                  <button
                    type="button"
                    onClick={() => handleDeleteTodo(editingTodo.id)}
                    className="text-red-600 text-sm"
                  >
                    Verwijderen
                  </button>
                ) : (
                  <div></div>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsTodoModalOpen(false)}
                    className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400"
                  >
                    Annuleren
                  </button>
                  <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg">
                    Opslaan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Question Modal */}
      {isQuestionModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <form onSubmit={handleSaveQuestion}>
              <div className="p-6 border-b">
                <h3 className="text-xl font-bold">Nieuwe Vraag</h3>
              </div>
              <div className="p-6 space-y-4">
                <textarea
                  name="question"
                  required
                  placeholder="Stel je vraag..."
                  className="w-full p-2 rounded-lg border bg-transparent focus:ring-2 focus:ring-primary outline-none resize-none"
                  rows={4}
                />
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                    Stel vraag aan
                  </label>
                  <select
                    name="recipientType"
                    id="recipientType"
                    value={recipientType}
                    className="w-full p-2 rounded-lg border bg-transparent focus:ring-2 focus:ring-primary outline-none"
                    onChange={(e) => {
                      setRecipientType(e.target.value as 'everyone' | 'specific')
                      // Reset recipients when changing type
                      const form = e.target.closest('form')
                      const recipientCheckboxes = form?.querySelectorAll('input[name="recipients"]') as NodeListOf<HTMLInputElement>
                      recipientCheckboxes?.forEach(cb => cb.checked = false)
                    }}
                  >
                    <option value="everyone">Iedereen</option>
                    <option value="specific">Specifieke personen</option>
                  </select>
                </div>
                {recipientType === 'specific' && (
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-2">
                      Selecteer personen
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {TEAM_MEMBERS.filter(m => m.id !== name?.toLowerCase()).map(member => (
                        <label key={member.id} className="flex items-center gap-2 p-2 rounded border hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                          <input type="checkbox" name="recipients" value={member.id} className="rounded" />
                          <span className="text-sm">{member.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsQuestionModalOpen(false)}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  Annuleren
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg">
                  Vraag Stellen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Answer Modal */}
      {isAnswerModalOpen && selectedQuestion && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
            <form onSubmit={handleSaveAnswer}>
              <div className="p-6 border-b">
                <h3 className="text-xl font-bold">Antwoord Geven</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">{selectedQuestion.question}</p>
              </div>
              <div className="p-6 space-y-4">
                <textarea
                  name="answer"
                  required
                  placeholder="Jouw antwoord..."
                  className="w-full p-2 rounded-lg border bg-transparent focus:ring-2 focus:ring-primary outline-none resize-none"
                  rows={4}
                />
              </div>
              <div className="p-4 bg-gray-50 dark:bg-gray-700/50 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => { setIsAnswerModalOpen(false); setSelectedQuestion(null); }}
                  className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400"
                >
                  Annuleren
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-bold text-white bg-primary rounded-lg">
                  Antwoord Geven
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

