export interface Movie {
  id: string; tmdb_id: number; title: string; poster_path: string | null; backdrop_path: string | null
  release_date: string | null; runtime: number | null; genres: string[]; director: string | null
  original_language: string | null; overview: string | null
}
export interface TmdbMovie {
  id: number; title: string; poster_path: string | null; backdrop_path?: string | null
  release_date?: string; overview?: string; vote_average?: number; original_language?: string
  genre_ids?: number[]; runtime?: number | null; genres?: { id: number; name: string }[]
  director?: string | null; cast?: string[]
}
export interface TmdbCastMember {
  id: number; name: string; original_name: string; character: string; profile_path: string | null
  cast_id: number; credit_id: string; order: number; known_for_department?: string
}
export interface TmdbCrewMember {
  id: number; name: string; original_name: string; department: string; job: string
  profile_path: string | null; credit_id: string
}
export interface TmdbMovieCredits {
  id: number; cast: TmdbCastMember[]; crew: TmdbCrewMember[]
}
export interface TmdbPerson {
  id: number; name: string; biography: string; birthday: string | null; place_of_birth: string | null
  known_for_department: string | null; profile_path: string | null; deathday: string | null
}
export interface TmdbPersonCredit {
  id: number; credit_id: string; media_type: 'movie' | 'tv'; title?: string; name?: string
  poster_path: string | null; release_date?: string; first_air_date?: string
  character?: string; job?: string; department?: string; overview?: string
}
export interface TmdbPersonCombinedCredits {
  id: number; cast: TmdbPersonCredit[]; crew: TmdbPersonCredit[]
}
export interface DiaryEntry {
  id: string; user_id: string; movie_id: string; watched_on: string; rating: number | null
  review: string | null; notes: string | null; is_rewatch: boolean; movies: Movie
}
export interface Profile {
  id: string; username: string | null; avatar_url: string | null; bio: string | null; favourite_genres: string[]
}
