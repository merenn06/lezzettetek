'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { RecipeListItem } from '@/lib/recipes';

const ITEMS_PER_PAGE = 6;

export default function Tarifler() {
  const [recipes, setRecipes] = useState<RecipeListItem[]>([]);
  const [displayedCount, setDisplayedCount] = useState(ITEMS_PER_PAGE);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const response = await fetch('/api/recipes', { cache: 'no-store' });
        const data = await response.json();
        if (data.success) {
          setRecipes(data.recipes || []);
        }
      } catch (error) {
        console.error('Tarifler yüklenirken hata:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecipes();
  }, []);

  const handleLoadMore = () => {
    setDisplayedCount((prev) => prev + ITEMS_PER_PAGE);
  };

  const displayedRecipes = recipes.slice(0, displayedCount);
  const hasMore = displayedCount < recipes.length;

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
      {/* Page Header */}
      <section className="py-24 px-4 bg-gradient-to-br from-green-50 to-amber-50">
        <div className="container mx-auto text-center">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Tarifler
          </h1>
          <p className="text-lg md:text-xl text-gray-700 max-w-3xl mx-auto leading-relaxed">
          Özenle seçilmiş, kolay uygulanır tariflerle sofranıza ilham katın. Lezzette tek nokta yaklaşımıyla hazırladık.
          </p>
        </div>
      </section>

      {/* Recipe Grid */}
      <section className="py-24 px-4 bg-white">
        <div className="container mx-auto">
          {loading ? (
            <div className="text-center py-16 text-gray-600">
              Tarifler yükleniyor...
            </div>
          ) : displayedRecipes.length === 0 ? (
            <div className="text-center py-16 text-gray-600">
              Henüz tarif eklenmemiş.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {displayedRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="bg-gray-50 rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
                  >
                    {/* Recipe Image */}
                    <div
                      className={`aspect-video bg-gradient-to-br ${getRecipeGradient(
                        recipe.difficulty
                      )} flex items-center justify-center overflow-hidden relative`}
                    >
                      {recipe.imageUrl ? (
                        <Image
                          src={recipe.imageUrl}
                          alt={recipe.title}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                          className="object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <svg
                          className="w-16 h-16 text-white opacity-80"
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

                    {/* Recipe Info */}
                    <div className="p-6">
                      <h3 className="text-xl font-bold mb-3 text-gray-900">
                        {recipe.title}
                      </h3>
                      <p className="text-gray-600 mb-3 leading-relaxed">
                        {recipe.shortDescription}
                      </p>
                      
                      {/* Difficulty and Duration */}
                      <p className="text-sm text-gray-500 mb-4">
                        {getDifficultyLabel(recipe.difficulty)} • {recipe.durationMinutes} dk
                      </p>

                      {/* View Recipe Button */}
                      <Link
                        href={`/tarifler/${recipe.slug}`}
                        className="w-full py-3 bg-green-700 text-white rounded-lg font-semibold hover:bg-green-800 transition-colors text-center block"
                      >
                        Tarifi Gör
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More Button */}
              {hasMore && (
                <div className="text-center mt-12">
                  <button
                    onClick={handleLoadMore}
                    className="px-8 py-3 bg-green-700 text-white rounded-lg font-semibold hover:bg-green-800 transition-colors shadow-md"
                  >
                    Daha Fazla Göster
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}

