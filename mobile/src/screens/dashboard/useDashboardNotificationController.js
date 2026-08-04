import { useCallback, useEffect, useRef, useState } from 'react'
import { Alert, Animated, Easing } from 'react-native'

import { ApiError } from '../../lib/authClient'
import {
  createEmptyCustomerNotificationSnapshot,
  loadCustomerNotificationSnapshot,
  markAllCustomerNotificationsReadLocally,
  markCustomerNotificationReadLocally,
  updateCustomerNotificationPreferences,
} from '../../lib/notificationClient'
import { createLatestRequestCoordinator } from './latestRequestCoordinator.mjs'

const createInitialNotificationModuleState = () => ({
  status: 'idle',
  errorMessage: '',
  savingKey: null,
  ...createEmptyCustomerNotificationSnapshot(),
})

export default function useDashboardNotificationController({ account }) {
  const [notificationsFeed, setNotificationsFeed] = useState([])
  const [moduleState, setModuleState] = useState(
    createInitialNotificationModuleState,
  )
  const [isVisible, setIsVisible] = useState(false)
  const animation = useRef(new Animated.Value(0)).current
  const coordinatorRef = useRef(null)
  const preferenceRequestIdRef = useRef(0)

  if (!coordinatorRef.current) {
    coordinatorRef.current = createLatestRequestCoordinator()
  }

  const close = useCallback(() => setIsVisible(false), [])
  const toggle = useCallback(() => setIsVisible((current) => !current), [])

  const reload = useCallback(async () => {
    const userId = account?.userId
    const accessToken = account?.accessToken
    const coordinator = coordinatorRef.current

    if (!userId || !accessToken) {
      coordinator.invalidate()
      setNotificationsFeed([])
      setModuleState(createInitialNotificationModuleState())
      return
    }

    const token = coordinator.begin(`${userId}:${accessToken}`)
    setModuleState((currentState) => ({
      ...currentState,
      status: 'loading',
      errorMessage: '',
    }))

    try {
      const snapshot = await loadCustomerNotificationSnapshot({
        userId,
        accessToken,
      })
      if (!coordinator.isCurrent(token)) {
        return
      }

      setNotificationsFeed(snapshot.notifications)
      setModuleState({
        status: 'ready',
        preferences: snapshot.preferences,
        notifications: snapshot.notifications,
        errorMessage: '',
        savingKey: null,
      })
    } catch (error) {
      if (!coordinator.isCurrent(token)) {
        return
      }

      const message =
        error instanceof ApiError && error.message
          ? error.message
          : 'We could not load your notification settings right now.'
      setNotificationsFeed([])
      setModuleState({
        status: 'error',
        preferences: null,
        notifications: [],
        errorMessage: message,
        savingKey: null,
      })
    }
  }, [account?.accessToken, account?.userId])

  useEffect(() => {
    void reload()
    return () => {
      coordinatorRef.current?.invalidate()
      preferenceRequestIdRef.current += 1
    }
  }, [reload])

  useEffect(() => {
    if (!isVisible) {
      return
    }

    animation.stopAnimation()
    animation.setValue(0)
    Animated.timing(animation, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start()
  }, [animation, isVisible])

  const updatePreference = useCallback(
    async (preferenceKey, value) => {
      const currentPreferences = moduleState.preferences
      if (!account?.accessToken || !account?.userId || !currentPreferences) {
        Alert.alert(
          'Notification Preferences',
          'Sign in again before changing customer notification settings.',
        )
        return
      }

      setModuleState((currentState) => ({
        ...currentState,
        status: 'ready',
        errorMessage: '',
        savingKey: preferenceKey,
        preferences: {
          ...currentState.preferences,
          [preferenceKey]: value,
        },
      }))
      const requestId = ++preferenceRequestIdRef.current

      try {
        const updatedPreferences = await updateCustomerNotificationPreferences({
          userId: account.userId,
          accessToken: account.accessToken,
          preferences: { [preferenceKey]: value },
        })
        if (requestId !== preferenceRequestIdRef.current) {
          return
        }
        setModuleState((currentState) => ({
          ...currentState,
          status: 'ready',
          preferences: updatedPreferences,
          errorMessage: '',
          savingKey: null,
        }))
      } catch (error) {
        if (requestId !== preferenceRequestIdRef.current) {
          return
        }
        const message =
          error instanceof ApiError && error.message
            ? error.message
            : 'We could not save your notification preferences right now.'
        setModuleState((currentState) => ({
          ...currentState,
          status: currentState.notifications?.length ? 'ready' : 'error',
          preferences: currentPreferences,
          errorMessage: message,
          savingKey: null,
        }))
        Alert.alert('Notification Preferences', message)
      }
    },
    [account?.accessToken, account?.userId, moduleState.preferences],
  )

  const markAllRead = useCallback(() => {
    setNotificationsFeed((current) =>
      markAllCustomerNotificationsReadLocally(current),
    )
    setModuleState((currentState) => ({
      ...currentState,
      notifications: markAllCustomerNotificationsReadLocally(
        currentState.notifications,
      ),
    }))
  }, [])

  const dismiss = useCallback((notificationKey) => {
    const keepOtherNotifications = (item) => item.key !== notificationKey
    setNotificationsFeed((current) => current.filter(keepOtherNotifications))
    setModuleState((currentState) => ({
      ...currentState,
      notifications: currentState.notifications.filter(keepOtherNotifications),
    }))
  }, [])

  const markOpened = useCallback((item) => {
    const markMatchingNotification = (notification) =>
      notification.key === item.key
        ? markCustomerNotificationReadLocally(notification)
        : notification
    setNotificationsFeed((current) => current.map(markMatchingNotification))
    setModuleState((currentState) => ({
      ...currentState,
      notifications: currentState.notifications.map(markMatchingNotification),
    }))
  }, [])

  return {
    animation,
    close,
    dismiss,
    isVisible,
    markAllRead,
    markOpened,
    moduleState,
    notificationsFeed,
    reload,
    toggle,
    updatePreference,
  }
}
