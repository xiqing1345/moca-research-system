import { TaskEvent, EventType } from "../types";

export class EventBus {
  private events: TaskEvent[] = [];

  addEvent(
    type: EventType,
    taskNumber: number,
    meta?: Record<string, any>
  ): TaskEvent {
    const event: TaskEvent = {
      type,
      taskNumber,
      t: Date.now(),
      meta,
    };
    this.events.push(event);
    return event;
  }

  getEvents(): TaskEvent[] {
    return [...this.events];
  }

  clearEvents(): void {
    this.events = [];
  }

  setEvents(events: TaskEvent[]): void {
    this.events = events;
  }
}

export const createEvent = (
  type: EventType,
  taskNumber: number,
  meta?: Record<string, any>
): TaskEvent => {
  return {
    type,
    taskNumber,
    t: Date.now(),
    meta,
  };
};
