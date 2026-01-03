# Hooks and Components

### Hooks

#### useClickRef() hook

In your components, you'll often need to call the CSPR.click API to get data or request an operation. To get a reference to the CSPR.click SDK instance make use of the `useClickRef()` React hook:

```tsx
import { useClickRef } from '@make-software/csprclick-ui';

function MyComponent() {
  const clickRef = useClickRef();
  ...
}
```

Then, in your application you'll be able to request CSPR.click to perform some operations using the class [methods](https://docs.cspr.click/cspr.click-sdk/reference/methods), or get values reading the class [properties](https://docs.cspr.click/cspr.click-sdk/reference/properties).

### Components

#### \<AccountIdenticon>

Use the `AccountIdenticon` component to display the public key identicon (or avatar). It can be used also with an account hash string.

<figure><img src="https://4098787943-files.gitbook.io/~/files/v0/b/gitbook-x-prod.appspot.com/o/spaces%2FMwTFKCda4irtFhY9tqGt%2Fuploads%2Fgit-blob-52a85210e4d0bb931c36afa877074a93f783e757%2Faccount-identicon-example.png?alt=media" alt="AccountIdenticon component example"><figcaption></figcaption></figure>

In addition to the public key or account hash, indicate the size of the resulting image: `'xs'` for `16px`; `'sm'` for `20px`; `'m'` for `32px`; or `'l'` for `40px`.

```tsx
<AccountIdenticon hex={publicKey} size={'l'} />
```

The size can be indicated with a number of pixels:

```tsx
<AccountIdenticon hex={accountHash} size={40}  />
```
