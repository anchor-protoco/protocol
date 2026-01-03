# Handling events

In your application, you'll need to listen and respond to different events emitted by the CSPR.click library. On this page, we're covering the most common. Check the [Events](https://docs.cspr.click/cspr.click-sdk/reference/events) page for a complete list of events.

The following code snippet shows an example of how to bind your handlers to the CSPR.click events with the React `useEffect()` hook:

```tsx
const clickRef = useClickRef();

useEffect(() => {
  clickRef?.on('csprclick:signed_in', async (evt) => {
    // update your app accordingly
  });
  clickRef?.on('csprclick:signed_out', async (evt) => {
    // update your app accordingly
  });
}, [clickRef?.on]);
```

### csprclick:signed\_in

This event is emitted every time the CSPR.click library connects to an account.

[csprclick:signed\_in](https://docs.cspr.click/reference/events#csprclick-signed_in) reference.

### csprclick:switched\_account

This event is emitted instead of `csprclick:signed_i` when the user has clicked on the Switch Account menu item and has switched to another account in the same or a different wallet.

[csprclick:switched\_account](https://docs.cspr.click/reference/events#csprclick-switched_account) reference.

### csprclick:signed\_out

This event is emitted when the CSPR.click library disconnects the active account due to a call to the `signOut()` SDK method.

[csprclick:signed\_out](https://docs.cspr.click/reference/events#csprclick-signed_out) reference.

### csprclick:disconnected

This event is emitted when CSPR.click library receives a disconnect request or event from the connected wallet. The app should close the current session as a consequence of this event.

It receives in the event object the provider that has been disconnected.

[csprclick:disconnected](https://docs.cspr.click/reference/events#csprclick-disconnected) reference.
