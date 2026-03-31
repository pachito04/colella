import { getReviews, getSuccessStories } from "../actions"
import { ReviewsManager } from "./ReviewsManager"
import { SuccessStoriesManager } from "./SuccessStoriesManager"

export default async function CMSPage() {
  const stories = await getSuccessStories()
  const reviews = await getReviews()

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-display">Administrar Casos de Éxito</h1>
      <p className="text-gray-500">Agrega, edita o elimina testimonios mostrados en la página principal.</p>
      
      <SuccessStoriesManager initialStories={stories} />
      <ReviewsManager initialReviews={reviews} />
    </div>
  )
}
