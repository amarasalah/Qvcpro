import { Printer } from 'lucide-react'

export default function PrintButton({ title, className = '' }) {
  const handlePrint = () => {
    if (title) {
      document.title = title
    }
    window.print()
  }

  return (
    <button
      className={`print-btn ${className}`}
      onClick={handlePrint}
      type="button"
      title="Imprimer cette page"
    >
      <Printer size={15} />
      <span>Imprimer</span>
    </button>
  )
}
