import { supabase } from './supabaseClient';

type RecipeRow = {
  id: string;
  title: string;
  slug: string;
  summary: string | null;
  content: string | null;
  image_url: string | null;
  difficulty: string | null;
  total_minutes: number | null;
  created_at: string;
};

const DEFAULT_DIFFICULTY = 'kolay';
const DEFAULT_TOTAL_MINUTES = 30;

export type RecipeListItem = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  difficulty: string;
  durationMinutes: number;
  imageUrl: string | null;
};

export type RecipeDetail = RecipeListItem & {
  content: string;
  imageUrl: string | null;
};

export async function getRecipes(): Promise<RecipeListItem[]> {
  if (!supabase) {
    console.error('Supabase client is not initialized');
    return [];
  }

  const { data, error } = await supabase
    .from('recipes')
    .select('id, title, slug, summary, image_url, difficulty, total_minutes')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Supabase recipes fetch error:', error);
    return [];
  }

  return (data as RecipeRow[]).map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    shortDescription: row.summary ?? 'Tarif detayları çok yakında.',
    difficulty: (row.difficulty ?? DEFAULT_DIFFICULTY).toLowerCase(),
    durationMinutes: row.total_minutes ?? DEFAULT_TOTAL_MINUTES,
    imageUrl: row.image_url,
  }));
}

export async function getRecipeBySlug(slug: string): Promise<RecipeDetail | null> {
  if (!supabase) {
    console.error('Supabase client is not initialized');
    return null;
  }

  const { data, error } = await supabase
    .from('recipes')
    .select('id, title, slug, summary, content, image_url, difficulty, total_minutes')
    .eq('slug', slug)
    .single();

  if (error) {
    if (error.code !== 'PGRST116') {
      // PGRST116: No rows found
      console.error('Supabase recipe fetch error:', error);
    }
    return null;
  }

  const row = data as RecipeRow;

  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    shortDescription: row.summary ?? 'Tarif detayları çok yakında.',
    difficulty: (row.difficulty ?? DEFAULT_DIFFICULTY).toLowerCase(),
    durationMinutes: row.total_minutes ?? DEFAULT_TOTAL_MINUTES,
    content: row.content ?? 'Bu tarifin içeriği yakında eklenecektir.',
    imageUrl: row.image_url,
  };
}

