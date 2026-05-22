interface FileDropSuccess {
	success: true
	name: string
}

export interface PlanRequestFileDropSuccess extends FileDropSuccess {
	type: 'plan-request'
	componentNames: string[]
	goalCount: number
	totalSteps: number
	currentStep: number
}

export class FileDropperError extends Error {
	constructor(message: string, options?: ErrorOptions) {
		super(message, options)
		this.name = 'FileDropperError'
	}
}

export type FileDropperSuccess = PlanRequestFileDropSuccess

export interface FileDropperFailure {
	success: false
	error: FileDropperError
}

export type FileDropperResult = FileDropperSuccess | FileDropperFailure

export type FileDropperParams = {
	name: string
	content: string
}

export type FileDropper = (params: FileDropperParams) => Promise<FileDropperResult>
