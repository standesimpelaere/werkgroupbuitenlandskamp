import { useState } from 'react';
import { useVersion, TEAM_MEMBERS, User, VersionType } from '../context/VersionContext';

export default function Login() {
  const { login } = useVersion();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedType, setSelectedType] = useState<VersionType>('shared_key');

  const handleEnter = () => {
    if (selectedUser && selectedType) {
      login(selectedUser, selectedType);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111418] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#1a2c1a] max-w-2xl w-full rounded-2xl shadow-xl border border-[#dbe6db] dark:border-[#304030] overflow-hidden">
        
        {/* Header */}
        <div className="bg-[#2E7D32] p-8 text-center">
          <h1 className="text-3xl font-black text-white tracking-tight">KSA Buitenlands Kamp</h1>
          <p className="text-white/80 mt-2 font-medium">Welkom bij de organisatiehub. Wie ben je?</p>
        </div>

        <div className="p-8 space-y-8">
          
          {/* Step 1: User Selection */}
          <div>
            <h2 className="text-sm font-bold text-[#618961] uppercase mb-4 flex items-center gap-2">
              <span className="bg-[#2E7D32] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">1</span>
              Kies je profiel
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TEAM_MEMBERS.map(user => (
                <button
                  key={user.id}
                  onClick={() => setSelectedUser(user)}
                  className={`p-4 rounded-xl border-2 font-bold transition-all flex flex-col items-center gap-2 ${
                    selectedUser?.id === user.id
                    ? 'border-[#2E7D32] bg-[#f0f5f0] dark:bg-[#243424] text-[#2E7D32]'
                    : 'border-transparent bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg shadow-sm ${
                    selectedUser?.id === user.id ? 'bg-[#2E7D32] text-white' : 'bg-white dark:bg-gray-700'
                  }`}>
                    {user.name.substring(0, 2)}
                  </div>
                  {user.name}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Version Selection */}
          <div className={`transition-opacity duration-500 ${selectedUser ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
            <h2 className="text-sm font-bold text-[#618961] uppercase mb-4 flex items-center gap-2">
              <span className="bg-[#2E7D32] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs">2</span>
              Kies je werkomgeving
            </h2>
            <div className="grid gap-4">
              
              {/* Shared Key (Recommended) */}
              <label className={`relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selectedType === 'shared_key' 
                ? 'border-[#2E7D32] bg-[#f0f5f0] dark:bg-[#243424]' 
                : 'border-gray-200 dark:border-gray-700 hover:border-[#2E7D32]/50'
              }`}>
                <input 
                  type="radio" 
                  name="version" 
                  value="shared_key" 
                  checked={selectedType === 'shared_key'} 
                  onChange={() => setSelectedType('shared_key')}
                  className="mt-1 text-[#2E7D32] focus:ring-[#2E7D32]" 
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[#111811] dark:text-white">Gedeelde Sleutel Versie</span>
                    <span className="bg-[#2E7D32] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">AANBEVOLEN</span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    Dit is de <strong>werkversie</strong> waar we samen aan sleutelen. Wijzigingen zijn zichtbaar voor iedereen die in deze versie werkt.
                  </p>
                </div>
              </label>

              {/* Personal Sandbox */}
              <label className={`relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selectedType === 'personal' 
                ? 'border-[#2E7D32] bg-[#f0f5f0] dark:bg-[#243424]' 
                : 'border-gray-200 dark:border-gray-700 hover:border-[#2E7D32]/50'
              }`}>
                <input 
                  type="radio" 
                  name="version" 
                  value="personal" 
                  checked={selectedType === 'personal'} 
                  onChange={() => setSelectedType('personal')}
                  className="mt-1 text-[#2E7D32] focus:ring-[#2E7D32]" 
                />
                <div>
                  <span className="font-bold text-[#111811] dark:text-white">Mijn Persoonlijke Zandbak</span>
                  <p className="text-sm text-gray-500 mt-1">
                    Een veilige omgeving om dingen uit te proberen zonder de rest te storen. Alleen jij ziet dit.
                  </p>
                </div>
              </label>

              {/* Concrete (Read Only-ish) */}
              <label className={`relative flex items-start gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selectedType === 'shared_concrete' 
                ? 'border-[#2E7D32] bg-[#f0f5f0] dark:bg-[#243424]' 
                : 'border-gray-200 dark:border-gray-700 hover:border-[#2E7D32]/50'
              }`}>
                <input 
                  type="radio" 
                  name="version" 
                  value="shared_concrete" 
                  checked={selectedType === 'shared_concrete'} 
                  onChange={() => setSelectedType('shared_concrete')}
                  className="mt-1 text-[#2E7D32] focus:ring-[#2E7D32]" 
                />
                <div>
                  <span className="font-bold text-[#111811] dark:text-white">Gedeelde Concrete Versie</span>
                  <p className="text-sm text-gray-500 mt-1">
                    De "officiële" versie. Gebruik dit vooral om te kijken wat er definitief beslist is. Wijzigingen hier worden overschreven bij een volgende push!
                  </p>
                </div>
              </label>

            </div>
          </div>

          {/* Action */}
          <button
            onClick={handleEnter}
            disabled={!selectedUser}
            className="w-full py-4 bg-[#2E7D32] hover:bg-[#246428] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-black text-lg rounded-xl shadow-lg transition-all transform active:scale-[0.98]"
          >
            Naar Organisatiehub
          </button>

        </div>
      </div>
    </div>
  );
}
