import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { getRecipeBySlug } from '@/lib/recipes';

export default async function RecipeDetailPage({ params }: { params: any }) {
  const { slug } = params;
  const recipe = await getRecipeBySlug(slug);

  if (!recipe) {
    notFound();
  }

  // Helper function to get gradient based on difficulty
  const getRecipeGradient = (difficulty: string) => {
    switch (difficulty) {
      case 'kolay':
        return 'from-green-200 to-green-300';
      case 'orta':
        return 'from-amber-200 to-amber-300';
      case 'zor':
        return 'from-purple-200 to-purple-300';
      default:
        return 'from-green-200 to-green-300';
    }
  };

  // Helper function to capitalize difficulty
  const getDifficultyLabel = (difficulty: string) => {
    switch (difficulty) {
      case 'kolay':
        return 'Kolay';
      case 'orta':
        return 'Orta';
      case 'zor':
        return 'Zor';
      default:
        return difficulty;
    }
  };


  return (
    <div className="w-full bg-white">
      {/* Back Link */}
      <div className="max-w-4xl mx-auto px-4 pt-8">
        <Link
          href="/tarifler"
          className="inline-flex items-center text-gray-600 hover:text-green-700 transition-colors mb-6"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Tariflere Dön
        </Link>
      </div>

      {/* Recipe Detail Content */}
      <section className="max-w-4xl mx-auto px-4 py-12">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Two Column Layout: Image and Info */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            {/* Image */}
            <div
              className={`aspect-square bg-gradient-to-br ${getRecipeGradient(
                recipe.difficulty
              )} rounded-xl flex items-center justify-center overflow-hidden relative`}
            >
              {recipe.imageUrl ? (
                <Image
                  src={recipe.imageUrl}
                  alt={recipe.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover"
                  priority
                />
              ) : (
                <svg
                  className="w-32 h-32 text-white opacity-80"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                  />
                </svg>
              )}
            </div>

            {/* Title and Badges */}
            <div className="flex flex-col justify-center">
              <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                {recipe.title}
              </h1>
              
              {/* Difficulty and Duration Badges */}
              <div className="flex flex-wrap gap-3">
                <span className="px-4 py-2 bg-green-100 text-green-700 rounded-full text-sm font-semibold">
                  {getDifficultyLabel(recipe.difficulty)}
                </span>
                <span className="px-4 py-2 bg-amber-100 text-amber-700 rounded-full text-sm font-semibold">
                  {recipe.durationMinutes} dk
                </span>
              </div>
            </div>
          </div>

          {/* Recipe Content */}
          <div className="prose prose-lg max-w-none">
            <div className="text-gray-700 leading-relaxed whitespace-pre-line text-base">
              {recipe.content}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

