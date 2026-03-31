import { getPatients } from "../actions"
import { format } from "date-fns"
import { es } from "date-fns/locale"
import { Users } from "lucide-react"
import { PatientsTable } from "./PatientsTable"

export default async function PatientsPage({ searchParams }: { searchParams: { q?: string } }) {
  const patients = await getPatients(searchParams.q)

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-gray-200 dark:border-neutral-800 pb-8">
        <div>
          <h1 className="text-4xl font-extrabold font-display tracking-tight text-gray-900 dark:text-white">Pacientes</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">{patients.length} pacientes registrados</p>
        </div>
      </div>
      <PatientsTable patients={patients} />
    </div>
  )
}
