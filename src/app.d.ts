// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { InteractivityProps } from '@threlte/extras'

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	namespace Threlte {
		interface UserProps extends InteractivityProps {}
	}
}

export {}
