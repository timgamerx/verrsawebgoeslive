import { createClient } from '@supabase/supabase-js';


const supabaseUrl =
	process.env.NEXT_PUBLIC_SUPABASE_URL ||
	process.env.SUPABASE_URL;
const supabaseAnonKey =
	process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
	process.env.SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
	auth: {
		persistSession: true,
		autoRefreshToken: true,
		detectSessionInUrl: true,
		flowType: 'pkce',
		// Prevent lock contention by using a more robust storage mechanism
		storage: typeof window !== 'undefined' ? window.localStorage : undefined,
		storageKey: 'sb-auth-token',
	},
});

// Cache for user session to prevent concurrent auth.getUser() calls
let userCache = null;
let userCacheTime = 0;
const CACHE_DURATION = 5000; // 5 seconds

export const getCachedUser = async () => {
	const now = Date.now();
	
	// Return cached user if still valid
	if (userCache && (now - userCacheTime) < CACHE_DURATION) {
		return userCache;
	}
	
	// Fetch fresh user data
	const { data: { user }, error } = await supabase.auth.getUser();
	
	if (!error && user) {
		userCache = user;
		userCacheTime = now;
	}
	
	return user;
};

// Clear cache when user signs out
export const clearUserCache = () => {
	userCache = null;
	userCacheTime = 0;
};

// Wrapper for signOut that clears the cache
export const signOut = async () => {
	clearUserCache();
	return await supabase.auth.signOut();
};


