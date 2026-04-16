import { type TaskItem } from '@components/Tasks'
import type PomodoroTimerPlugin from 'main'
import { TFile, Keymap, MarkdownView, type HeadingCache, type CachedMetadata } from 'obsidian'
import { DESERIALIZERS, POMODORO_REGEX } from 'serializers'
import {
	writable,
	type Readable,
	type Writable,
	type Unsubscriber,
} from 'svelte/store'
import { extractTaskComponents } from '@utils/utils'

export type TaskTrackerState = {
	task?: TaskItem
	tasks: TaskItem[]
	file?: TFile
	availableFileHeadings?: HeadingCache[]
	fileHeading?: HeadingCache
	filePinned: boolean
	comment: string
}

type TaskTrackerStore = Readable<TaskTrackerState>

const DEFAULT_TRACKER_STATE: TaskTrackerState = {
	tasks: [],
	filePinned: false,
	comment: ''
}

export default class TaskTracker implements TaskTrackerStore {
	private plugin

	private state: TaskTrackerState

	private store: Writable<TaskTrackerState>

	public subscribe

	private unsubscribers: Unsubscriber[] = []

	constructor(plugin: PomodoroTimerPlugin) {
		this.plugin = plugin
		this.state = { ...DEFAULT_TRACKER_STATE, tasks: [] }
		this.store = writable(this.state)
		this.subscribe = this.store.subscribe
		this.unsubscribers.push(
			this.store.subscribe((state) => {
				this.state = state
			}),
		)

		plugin.registerEvent(
			//loadtasks on file change
			plugin.app.workspace.on('active-leaf-change', () => {
				if (!this.state.filePinned) {
					this.setToCurrentFile()
				}
			}),
		)

		plugin.app.workspace.onLayoutReady(() => {
			this.setToCurrentFile()
		})
	}
	get task() {
		return this.state.task
	}

	get tasks() {
		return this.state.tasks
	}

	get file() {
		return this.state.file
	}

	get comment() {
		return this.state.comment
	}

	public setFile(file: TFile) {
		this.store.update((state) => {
			if (state.file?.path !== file?.path) {
				// Don't affect task when changing file
				// state.task = undefined
			}
			state.file = file ?? state.file
			return state
		})
	}

	public setToCurrentFile() {
		let file = this.plugin.app.workspace.getActiveFile()
		if (file) {
			this.setFile(file)
		}
	}

	// TODO:  Currently it just updates the tracker name, nothing else. -> Update the name in the tracker based on the file.
	public setTaskName(name: string) {
		this.store.update((state) => {
			if (state.task) {
				state.task.name = name
				if (state.tasks.length > 0) {
					state.tasks[0].name = name
				}
			}
			return state
		})
	}

	public async readFileHeadings(file?: TFile) {
		if (file && file.extension == 'md') {
			const content = await this.plugin.app.vault.cachedRead(file)
			const headings = this.resolveHeadings(content, this.plugin.app.metadataCache.getFileCache(file))

			this.store.update((state) => {
				state.availableFileHeadings = headings
				return state
			})
		}
	}

	private resolveHeadings(content: string, metadata: CachedMetadata | null,): HeadingCache[] {
		if (!content || !metadata) {
			return []
		}
		return metadata.headings || []
	}

	public setComment(comment: string) {
		this.store.update((state) => {
			state.comment = comment
			return state
		})
	}

	public setFileHeading(headingText: string) {
		const heading = this.state.availableFileHeadings?.find(h => h.heading === headingText)
		this.store.update((state) => {
			state.fileHeading = heading
			return state
		})
	}

	public togglePinned() {
		this.store.update((state) => {
			state.filePinned = !state.filePinned
			return state
		})
	}

	public async active(task: TaskItem) {
		await this.ensureBlockId(task)
		this.store.update((state) => {
			state.tasks = [task]
			state.task = task
			return state
		})

		await this.syncPrimaryTaskHeadings()
	}

	private toTaskKey(task: TaskItem) {
		if (task.blockLink) {
			return task.blockLink
		}
		return `${task.path}:${task.line}`
	}

	private isSameTask(a: TaskItem, b: TaskItem) {
		return this.toTaskKey(a) === this.toTaskKey(b)
	}

	private refreshPrimaryTask(state: TaskTrackerState) {
		state.task = state.tasks[0]
		if (!state.task) {
			state.availableFileHeadings = undefined
			state.fileHeading = undefined
		}
	}

	private async syncPrimaryTaskHeadings() {
		if (!this.state.task) {
			return
		}
		const file = this.plugin.app.vault.getAbstractFileByPath(
			this.state.task.path,
		)
		if (file instanceof TFile) {
			await this.readFileHeadings(file)
		}
	}

	public async toggleTask(task: TaskItem) {
		const exists = this.state.tasks.some((selected) =>
			this.isSameTask(selected, task),
		)

		if (exists) {
			await this.removeTask(task)
			return
		}

		await this.ensureBlockId(task)
		const previousPrimaryKey = this.state.task
			? this.toTaskKey(this.state.task)
			: ''
		let nextPrimaryKey = previousPrimaryKey
		this.store.update((state) => {
			state.tasks = [...state.tasks, task]
			this.refreshPrimaryTask(state)
			nextPrimaryKey = state.task ? this.toTaskKey(state.task) : ''
			return state
		})

		if (nextPrimaryKey !== previousPrimaryKey) {
			await this.syncPrimaryTaskHeadings()
		}
	}

	public async removeTask(task: TaskItem) {
		const previousPrimaryKey = this.state.task
			? this.toTaskKey(this.state.task)
			: ''
		let nextPrimaryKey = previousPrimaryKey
		this.store.update((state) => {
			state.tasks = state.tasks.filter(
				(selected) => !this.isSameTask(selected, task),
			)
			this.refreshPrimaryTask(state)
			nextPrimaryKey = state.task ? this.toTaskKey(state.task) : ''
			return state
		})

		if (nextPrimaryKey !== previousPrimaryKey) {
			await this.syncPrimaryTaskHeadings()
		}
	}

	public syncSelectedTasks(latestTasks: TaskItem[]) {
		this.store.update((state) => {
			if (state.tasks.length === 0) {
				return state
			}

			const syncedTasks: TaskItem[] = []
			for (const selected of state.tasks) {
				const latest = latestTasks.find((task) =>
					this.isSameTask(task, selected),
				)
				if (latest) {
					syncedTasks.push({
						...latest,
						name: selected.name,
					})
				}
			}

			state.tasks = syncedTasks
			this.refreshPrimaryTask(state)
			return state
		})
	}

	private async ensureBlockId(task: TaskItem) {
		let file = this.plugin.app.vault.getAbstractFileByPath(task.path)
		if (file && file instanceof TFile) {
			const f = file as TFile
			if (f.extension === 'md') {
				let content = await this.plugin.app.vault.read(f)
				let lines = content.split('\n')
				if (lines.length > task.line) {
					let line = lines[task.line]
					if (task.blockLink) {
						if (!line.endsWith(task.blockLink)) {
							// block id mismatch?
							lines[task.line] += `${task.blockLink}`
							await this.plugin.app.vault.modify(
								f,
								lines.join('\n'),
							)
							return
						}
					} else {
						// generate block id
						let blockId = this.createBlockId()
						task.blockLink = blockId
						lines[task.line] += `${blockId}`
						await this.plugin.app.vault.modify(f, lines.join('\n'))
					}
				}
			}
		}
	}

	private createBlockId() {
		return ` ^${Math.random().toString(36).substring(2, 6)}`
	}

	public clear() {
		console.log("clearing task tracker")
		this.store.update((state) => {
			state.tasks = []
			state.task = undefined
			state.availableFileHeadings = undefined
			state.fileHeading = undefined
			return state
		})
	}

	public openFile(event: MouseEvent) {
		if (this.state.file) {
			const leaf = this.plugin.app.workspace.getLeaf(
				Keymap.isModEvent(event),
			)
			leaf.openFile(this.state.file)
		}
	}

	public openTask = (event: MouseEvent, task?: TaskItem) => {
		if (!task) {
			console.log("task to open not found")
			return
		}
		let file = this.plugin.app.vault.getAbstractFileByPath(task.path)
		if (file && file instanceof TFile && task.line >= 0) {
			const leaf = this.plugin.app.workspace.getLeaf(
				Keymap.isModEvent(event),
			)
			leaf.openFile(file, { eState: { line: task.line } })
		}
	}

	get pinned() {
		return this.state.filePinned
	}

	public finish() { }

	//TODO: "Destory"?
	public destory() {
		for (let unsub of this.unsubscribers) {
			unsub()
		}
	}

	public sync(task: TaskItem) {
		this.store.update((state) => {
			const idx = state.tasks.findIndex((selected) =>
				this.isSameTask(selected, task),
			)
			if (idx === -1) {
				return state
			}
			const name = state.tasks[idx].name
			state.tasks[idx] = { ...task, name }
			this.refreshPrimaryTask(state)
			return state
		})
	}

	public async updateActual() {
		// update task item
		if (
			this.plugin.getSettings().enableTaskTracking &&
			this.task &&
			this.task.blockLink
		) {
			let file = this.plugin.app.vault.getAbstractFileByPath(
				this.task.path,
			)
			if (file && file instanceof TFile) {
				let f = file as TFile
				this.store.update((state) => {
					if (state.task) {
						if (state.task.actual >= 0) {
							state.task.actual += 1
						} else {
							state.task.actual = 1
						}
						if (state.tasks.length > 0) {
							state.tasks[0].actual = state.task.actual
						}
					}
					return state
				})
				await this.incrTaskActual(this.task.blockLink, f)
			}
		} else if (!this.plugin.getSettings().enableTaskTracking) {
			console.debug("Task tracking is disabled — skipping tomato update.");
		}
	}

	private async incrTaskActual(blockLink: string, file: TFile) {
		const format = this.plugin.getSettings().taskFormat

		if (file.extension !== 'md') {
			return
		}

		let metadata = this.plugin.app.metadataCache.getFileCache(file)
		let content = await this.plugin.app.vault.read(file)

		if (!content || !metadata) {
			return
		}

		const lines = content.split('\n')

		for (let rawElement of metadata.listItems || []) {
			if (rawElement.task) {
				let lineNr = rawElement.position.start.line
				let line = lines[lineNr]

				const components = extractTaskComponents(line)

				if (!components) {
					continue
				}

				if (components.blockLink === blockLink) {
					const match = components.body.match(POMODORO_REGEX)
					if (match !== null) {
						let pomodoros = match[1]
						let [actual, expected] = pomodoros.split('/')
						actual = actual || '0'
						let text = `🍅:: ${parseInt(actual) + 1}`
						if (expected !== undefined) {
							text += `/${expected.trim()}`
						}
						line = line
							.replace(/🍅:: *(\d* *\/? *\d* *)/, text)
							.trim()
					} else {
						let detail = DESERIALIZERS[format].deserialize(
							components.body,
						)
						line = line.replace(
							detail.description,
							`${detail.description} [🍅:: 1]`,
						)
					}

					lines[lineNr] = line

					await this.plugin.app.vault.modify(file, lines.join('\n'))

					this.plugin.app.metadataCache.trigger(
						'changed',
						file,
						content,
						metadata,
					)

					this.plugin.app.workspace
						.getActiveViewOfType(MarkdownView)
						?.load()
					break
				}
			}
		}
	}
}
