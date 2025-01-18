import type { FeedViewType } from "@follow/constants"

import { setFeedUnreadDirty } from "~/atoms/feed"
import { apiClient } from "~/lib/api-fetch"
import { FeedUnreadService } from "~/services"

import { createTransaction, createZustandStore } from "../utils/helper"

interface UnreadState {
  data: Record<string, number>
}
/**
 * Store for `feed` unread count
 */
export const useFeedUnreadStore = createZustandStore<UnreadState>("unread")(() => ({
  data: {},
}))

const set = useFeedUnreadStore.setState
const get = useFeedUnreadStore.getState
class FeedUnreadActions {
  private internal_reset() {
    set({ data: {} })
    FeedUnreadService.clear()
  }

  clear() {
    this.internal_reset()
  }

  private async internal_setValue(data: [string, number][]) {
    const tx = createTransaction()
    tx.optimistic(() => {
      set((state) => {
        state.data = { ...state.data }
        for (const [key, value] of data) {
          state.data[key] = value
        }
        return { ...state }
      })
    })

    tx.persist(async () => {
      await FeedUnreadService.updateFeedUnread(data)
    })
    await tx.run()
  }

  async fetchUnreadByView(view: FeedViewType | undefined) {
    const unread = await apiClient.reads.$get({
      query: { view: String(view) },
    })

    const { data } = unread

    this.internal_setValue(Object.entries(data))

    return data
  }

  async fetchUnreadAll() {
    const unread = await apiClient.reads.$get({
      query: {},
    })

    const { data } = unread
    this.internal_reset()

    this.internal_setValue(Object.entries(data))
    return data
  }

  /**
   * @returns previous value
   */
  incrementByFeedId(feedId: string, inc: number) {
    const state = get()
    const cur = state.data[feedId]
    const nextValue = Math.max(0, (cur || 0) + inc)

    this.internal_setValue([[feedId, nextValue]])
    setFeedUnreadDirty(feedId)
    return cur
  }

  updateByFeedId(feedId: string, unread: number) {
    this.internal_setValue([[feedId, unread]])
  }

  subscribeUnreadCount(fn: (count: number) => void, immediately?: boolean) {
    const handler = (state: UnreadState): void => {
      let unread = 0
      for (const key in state.data) {
        unread += state.data[key]!
      }

      fn(unread)
    }
    if (immediately) {
      handler(get())
    }
    return useFeedUnreadStore.subscribe(handler)
  }

  hydrate(
    data: {
      id: string
      count: number
    }[],
  ) {
    set((state) => {
      state.data = { ...state.data }

      for (const { id, count } of data) {
        state.data[id] = count
      }

      return { ...state }
    })
  }
}

export const feedUnreadActions = new FeedUnreadActions()
