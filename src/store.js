/* eslint-disable prettier/prettier */
/**
 * @arbo77
 */

import { useEffect, useState } from 'react'
import firebase from 'firebase/app'
import 'firebase/auth'

const State = {}

const AsyncStorage = window.localStorage

export const syncRemote = (data) => {
  const cleanData = JSON.stringify(data)
  data = JSON.parse(cleanData.replaceAll(/'/g, ''))
  const me = JSON.parse(AsyncStorage.getItem('me') || {})
  return window.fetch('https://api.kesatu.co.id/', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `key=${me.token || 'development'}`
    },
    body: JSON.stringify({
      to: [],
      action: 'object.sync',
      params: data
    })
  })
    .then((response) => {
      if (response.status === 200) {
        return response
      } else {
        throw new Error(`HTTP return status code ${response.status}`)
      }
    })
    .then((response) => response.json())
    .then((response) => {
      if (response.status === false) {
        throw new Error(
          `API return error with message: ${response.response.message}`
        )
      } else {
        return response.data
      }
    })
    .catch((error) => {
      console.error(error)
    })
}

export function getState() {
  return State
}

export function store(options) {
  State[options.key] = {
    key: options.key,
    value: options.default,
    type: options.type,
    subscribers: [],
    get() {
      return this.value
    },
    set(newValue) {
      this.value = { ...this.value, ...newValue }
      AsyncStorage.setItem(options.key, JSON.stringify(this.value))
      this.subscribers.forEach((s) => s(this.value))
      this.send(newValue)
    },
    send(newValue) {
      if (!this.type) {
        return
      }
      const subscribers = this.subscribers
      syncRemote({
        type: this.type,
        id: this.value.id,
        ...newValue
      }).then(($) => {
        if ($) {
          AsyncStorage.setItem(options.key, JSON.stringify($))
          subscribers.forEach((s) => s($))
        }
      })
    },
    subscribe(callback) {
      this.subscribers.push(callback)
    },
    unsubscribe(callback) {
      this.subscribers = this.subscribers.filter((s) => s !== callback)
    }
  }
  ;(() => {
    const value = AsyncStorage.getItem(options.key)
    if (value) {
      State[options.key].set(JSON.parse(value))
    }
  })()
}

export function useStore(key, options) {
  if (!key) {
    throw Error('Missing key argument')
  }
  if (!State[key]) {
    store(Object.assign(options || {}, { key: key }))
  }
  const state = State[key]
  const [, setBridgeValue] = useState(state.get())

  useEffect(() => {
    const subscription = (updatedValue) => {
      setBridgeValue(updatedValue)
    }
    state.subscribe(subscription)
    return () => {
      state.unsubscribe(subscription)
    }
  }, [state])

  return [
    state.get(),
    (newValue) => {
      state.set(newValue)
    }
  ]
}

export function useAuth(config) {
  const AUTH_WAIT = -1
  const AUTH_FAIL = 0
  const AUTH_SUCCESS = 1
  const provider = new firebase.auth.GoogleAuthProvider()

  const [load, setLoad] = useState(false)
  const [state, setLogged] = useState(AUTH_WAIT)
  const [user, setUser] = useStore('me')

  try {
    firebase.initializeApp(config)
  } catch (ex) {
  } finally {
    try {
      if (!load) {
        setLoad(true)
        firebase.auth().onAuthStateChanged((user) => {
          if (user) {
            const me = {
              token: user.xa,
              uid: user.uid,
              profile: {
                email: user.email,
                display_name: user.displayName,
                photo_url: user.photoURL,
                phone_number: user.phoneNumber
              },
              auth_provider: {
                id: user.providerData[0].providerId,
                creation_time: user.metadata.a,
                creation: user.metadata.creationTime,
                last_signin_time: user.metadata.b,
                last_signin: user.metadata.lastSignInTime
              }
            }
            setLogged(AUTH_SUCCESS)
            setUser(me)
          } else {
            setLogged(AUTH_FAIL)
            firebase
              .auth()
              .getRedirectResult()
              .then((result) => {})
              .catch(function (error) {
                console.error(error)
              })
          }
        })
      }
    } catch (ex) {
      console.log('ex', ex)
    }
  }
  return {
    state: state,
    user: user,
    signIn: () => {
      firebase.auth().signInWithRedirect(provider)
    },
    signOut: () => {
      firebase
        .auth()
        .signOut()
        .then(() => {
          AsyncStorage.clear()
          window.location = '/'
        })
    }
  }
}
