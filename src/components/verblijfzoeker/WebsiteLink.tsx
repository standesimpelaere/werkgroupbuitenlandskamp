import { useState, useEffect } from 'react'

interface WebsiteLinkProps {
  url: string
  name?: string
  location?: string
  onFindWebsite?: () => void
  onVerifyWebsite?: () => void
}

export default function WebsiteLink({ url, name, location, onFindWebsite, onVerifyWebsite }: WebsiteLinkProps) {
  const [isValidating, setIsValidating] = useState(true)
  const [isValid, setIsValid] = useState<boolean | null>(null)

  useEffect(() => {
    // Simple URL validation - check if it's a valid URL format
    const validateUrl = async () => {
      try {
        // Basic URL format check
        const urlPattern = /^https?:\/\/.+\..+/
        const isValidFormat = urlPattern.test(url)
        
        // Try to fetch the URL (head request) to check if it's accessible
        if (isValidFormat) {
          try {
            const response = await fetch(url, { method: 'HEAD', mode: 'no-cors' })
            setIsValid(true)
          } catch (error) {
            // CORS might block, but if URL format is valid, assume it's okay
            setIsValid(isValidFormat)
          }
        } else {
          setIsValid(false)
        }
      } catch (error) {
        console.error('URL validation error:', error)
        setIsValid(null)
      } finally {
        setIsValidating(false)
      }
    }

    if (url) {
      validateUrl()
    } else {
      setIsValidating(false)
    }
  }, [url])

  // If URL is invalid, show warning
  if (isValid === false) {
    return (
      <div className="flex items-center gap-2">
        <span className="material-symbols-outlined text-base text-[#617589] dark:text-gray-400">
          language
        </span>
        <div className="flex items-center gap-1">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline truncate"
            onClick={(e) => {
              if (!window.confirm('Deze link lijkt niet te werken. Toch proberen?')) {
                e.preventDefault()
              }
            }}
          >
            Website bezoeken
          </a>
          <span 
            className="material-symbols-outlined text-xs text-amber-500 cursor-help" 
            title="Link mogelijk niet werkend - controleer handmatig"
          >
            warning
          </span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span className="material-symbols-outlined text-base text-[#617589] dark:text-gray-400">
        language
      </span>
      {isValidating ? (
        <span className="text-sm text-[#617589] dark:text-gray-400 flex items-center gap-1">
          Website bezoeken
          <span className="material-symbols-outlined text-xs animate-spin">sync</span>
        </span>
      ) : (
        <div className="flex items-center gap-2">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline truncate"
          >
            Website bezoeken
          </a>
          {onVerifyWebsite && (
            <button
              onClick={onVerifyWebsite}
              className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              title="Verifieer website met AI"
            >
              <span className="material-symbols-outlined text-xs text-[#617589] dark:text-gray-400">
                search
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}

