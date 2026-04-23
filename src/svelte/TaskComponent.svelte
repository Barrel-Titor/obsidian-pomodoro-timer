<script lang="ts">
import type TaskTracker from '@components/TaskTracker'
import Tasks, { type TaskItem } from '@components/Tasks'
import { extractProgressText } from '@utils/utils'
import TaskItemComponent from '@svelte/TaskItemComponent.svelte'

export let tasks: Tasks
export let tracker: TaskTracker
export let render: (content: string, el: HTMLElement) => void
const r = (content: string, el: HTMLElement) => {
    render(content, el)
}

let selectedHeading = ''
let isCommentExpanded = false
// TODO: Re-enable heading selector when "log under heading" flow is implemented.
const SHOW_HEADING_SELECTOR = false

$: if (selectedHeading !== '') {
    tracker.setFileHeading(selectedHeading)
}

// TODO: Hook into event where the actual task name was changed and trigger an immediate reload
// const changeTaskName = (e: Event) => {
//     let target = e.target as HTMLInputElement
//     tracker.setTaskName(target.value)
// }

const removeTask = () => {
    tracker.clear()
}

const removeSingleTask = (task: TaskItem) => {
    tracker.removeTask(task)
}

const changeComment = (e: Event) => {
    let target = e.target as HTMLInputElement
    tracker.setComment(target.value)
}

const toggleComment = () => {
    isCommentExpanded = !isCommentExpanded
}

// const openFile = (e: MouseEvent) => {
//     tracker.openFile(e)
// }

const openTask = (e: MouseEvent, task: TaskItem | undefined = tracker.task) => {
    tracker.openTask(e, task)
}
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- svelte-ignore a11y-no-static-element-interactions -->

<!-- <span> -->
<!--     {$tracker.task} -->
<!-- </span> -->

{#if $tracker.tasks && $tracker.tasks.length > 0}
    <div class="pomodoro-tasks-wrapper">
        <div class="pomodoro-tasks-header">
            <div class="pomodoro-tasks-left">
                <span class="pomodoro-tasks-header-label">
                    Tasks ({$tracker.tasks.length})
                </span>
            </div>
        </div>

        {#if SHOW_HEADING_SELECTOR &&
            $tracker?.availableFileHeadings &&
            $tracker?.availableFileHeadings.length > 0}
            <div class="pomodoro-heading-selector">
                <label for="heading-select">Log under heading:</label>
                <select id="heading-select" bind:value={selectedHeading}>
                    <option value="">Default</option>
                    {#each $tracker.availableFileHeadings as heading}
                        <option value={heading.heading}>
                            {'#'.repeat(heading.level)} {heading.heading}
                        </option>
                    {/each}
                </select>
            </div>
        {/if}

        <div class="pomodoro-tasks-active">
            {#each $tracker.tasks as selectedTask, index}
                <div
                    class="pomodoro-tasks-item {index === 0
                        ? 'pomodoro-tasks-item-primary'
                        : ''}">
                    <div class="pomodoro-tasks-name-row">
                        <span
                            class="pomodoro-task-label"
                            on:click={(e) => openTask(e, selectedTask)}>
                            <TaskItemComponent
                                render={r}
                                content={selectedTask.name} />
                        </span>
                        <span
                            class="pomodoro-tasks-remove"
                            on:click={() => removeSingleTask(selectedTask)}>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="12"
                                height="12"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                class="lucide lucide-x"
                                ><path d="M18 6 6 18" /><path
                                    d="m6 6 12 12" /></svg>
                        </span>
                    </div>
                    <div class="pomodoro-tasks-progress">
                        {extractProgressText(selectedTask)}
                    </div>
                </div>
            {/each}
        </div>

        {#if isCommentExpanded}
            <input
                class="pomodoro-comment-input"
                type="text"
                placeholder="Session comment..."
                value={$tracker.comment}
                on:input={changeComment} />
        {/if}

        <div class="pomodoro-tasks-toolbar">
            <span class="pomodoro-tasks-comment-toggle" on:click={toggleComment}>
                {isCommentExpanded ? '-' : '+'}
            </span>
            <span class="pomodoro-tasks-clear-all" on:click={removeTask}>
                Clear all
            </span>
        </div>
    </div>
{/if}

<style>
.pomodoro-comment-input {
    margin: 0.5rem 0;
    width: 100%;
    font-size: 0.85rem;
    padding: 0.3rem 0.5rem;
    border-radius: 0.3rem;
    background-color: var(--background-secondary);
    color: var(--text-normal);
}

.pomodoro-tasks-remove {
    cursor: pointer;
}

.pomodoro-task-label {
    flex: 1;
    min-width: 0;
    display: flex;
    cursor: pointer;
}

.pomodoro-tasks-item-primary {
    box-shadow: inset 2px 0 0 var(--interactive-accent);
}

.pomodoro-heading-selector {
    padding: 0.5rem 1rem;
    border-bottom: 1px solid var(--background-modifier-border);
}

.pomodoro-heading-selector label {
    font-size: 0.8rem;
    color: var(--text-muted);
    margin-right: 0.5rem;
}

.pomodoro-heading-selector select {
    padding: 0.3rem 0.5rem;
    border-radius: 0.3rem;
    background-color: var(--background-secondary);
    color: var(--text-normal);
    border: 1px solid var(--background-modifier-border);
    font-size: 0.8rem;
}

.pomodoro-tasks-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-top: 1px solid var(--background-modifier-border);
    padding: 0.5rem 1rem;
    gap: 0.75rem;
}

.pomodoro-tasks-comment-toggle,
.pomodoro-tasks-clear-all {
    display: inline-flex;
    align-items: center;
    min-height: 1rem;
    line-height: 1;
    color: var(--text-muted);
    cursor: pointer;
    user-select: none;
}

.pomodoro-tasks-comment-toggle {
    font-size: 1rem;
    padding-right: 0.35rem;
}

.pomodoro-tasks-clear-all {
    font-size: 0.8rem;
    margin-left: auto;
}

.pomodoro-tasks-comment-toggle:hover,
.pomodoro-tasks-clear-all:hover {
    color: var(--text-normal);
}
</style>
