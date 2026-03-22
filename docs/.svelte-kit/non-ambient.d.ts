
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/" | "/api" | "/api/memory" | "/api/memory/stats" | "/api/orchestrator" | "/api/sessions" | "/api/sessions/[id]" | "/api/sessions/[id]/messages" | "/api/tools" | "/hello";
		RouteParams(): {
			"/api/sessions/[id]": { id: string };
			"/api/sessions/[id]/messages": { id: string }
		};
		LayoutParams(): {
			"/": { id?: string };
			"/api": { id?: string };
			"/api/memory": Record<string, never>;
			"/api/memory/stats": Record<string, never>;
			"/api/orchestrator": Record<string, never>;
			"/api/sessions": { id?: string };
			"/api/sessions/[id]": { id: string };
			"/api/sessions/[id]/messages": { id: string };
			"/api/tools": Record<string, never>;
			"/hello": Record<string, never>
		};
		Pathname(): "/" | "/api/memory" | "/api/memory/stats" | "/api/orchestrator" | "/api/sessions" | `/api/sessions/${string}` & {} | `/api/sessions/${string}/messages` & {} | "/api/tools" | "/hello";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/robots.txt" | string & {};
	}
}