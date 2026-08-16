// src/types/index.ts

export type Task = {
    id: string
    user_id: string
    project_id: string | null
    name: string
    priority: 'high' | 'medium' | 'low'
    due_date: string | null
    done: boolean
    created_at: string
  }
  
  export type Project = {
    id: string
    user_id: string
    name: string
    color: string
    created_at: string
  }
  
  export type Schedule = {
    id: string
    user_id: string
    day: string
    time_start: string
    time_end: string
    title: string
    type: 'study' | 'break' | 'prayer' | 'work' | 'meeting' | 'other'
    project_id: string | null
    task_id: string | null
    created_at: string
  }
  
  export type Note = {
    id: string
    user_id: string
    content: string
    updated_at: string
  }
  
  export type Settings = {
    id: string
    user_id: string
    theme: 'dark' | 'light'
    primary_color: string
    prayer_times: string[]
    pomodoro: {
      sessionDuration: number
      shortBreak: number
      cyclesBeforeLong: number
      longBreak: number
    }
    updated_at: string
  }