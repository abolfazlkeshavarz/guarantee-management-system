import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Home } from 'lucide-react'

export function NotFoundPage() {
  const { t } = useTranslation()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-gray-900">{t('notFound.title')}</h1>
        <h2 className="text-3xl font-semibold text-gray-700 mt-4">{t('notFound.subtitle')}</h2>
        <p className="text-gray-500 mt-2">
          {t('notFound.description')}
        </p>
        <Link to="/" className="mt-6 inline-block">
          <Button>
            <Home className="me-2 h-4 w-4" />
            {t('notFound.backHome')}
          </Button>
        </Link>
      </div>
    </div>
  )
}