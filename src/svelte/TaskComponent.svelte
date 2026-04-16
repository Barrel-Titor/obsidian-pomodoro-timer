<script lang="ts">
import type TaskTracker from '@components/TaskTracker'
import Tasks, { type TaskItem } from '@components/Tasks'
import { extractProgressText } from '@utils/utils'

export let tasks: Tasks
export let tracker: TaskTracker
export let render: (content: string, el: HTMLElement) => void
const r = (content: string, el: HTMLElement) => {
    render(content, el)
}

let selectedHeading = ''

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
            <div class="pomodoro-tasks-right">
                <span class="pomodoro-tasks-file-name" on:click={openTask}>
                    {$tracker.task?.fileName}
                </span>
            </div>
        </div>

        {#if $tracker?.availableFileHeadings && $tracker?.availableFileHeadings.length > 0}
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
                <div class="pomodoro-tasks-item">
                    <div class="pomodoro-tasks-name-row">
                        <span class="pomodoro-task-label">
                            <span on:click={(e) => openTask(e, selectedTask)}>
                                {selectedTask.name}
                            </span>
                        </span>
                        {#if index === 0}
                            <span class="pomodoro-task-primary">Primary</span>
                        {/if}
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

        <input
            class="pomodoro-comment-input"
            type="text"
            placeholder="Session comment..."
            value={$tracker.comment}
            on:input={changeComment} />

        <div class="pomodoro-tasks-toolbar">
            <span class="pomodoro-tasks-clear-all" on:click={removeTask}>
                Clear all
            </span>
        </div>
    </div>
{/if}

<style>
.pomodoro-comment-input {
    margin: 1rem 2rem 1rem 0rem;
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

.pomodoro-task-label span {
    cursor: pointer;
}

.pomodoro-task-primary {
    font-size: 0.7rem;
    color: var(--text-on-accent-inverted);
    background: var(--interactive-accent);
    border-radius: 999px;
    padding: 0 0.4rem;
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
    border-top: 1px solid var(--background-modifier-border);
    padding: 0.5rem 0;
}

.pomodoro-tasks-clear-all {
    font-size: 0.8rem;
    color: var(--text-muted);
    cursor: pointer;
}
</style>
