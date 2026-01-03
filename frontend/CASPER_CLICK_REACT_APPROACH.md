import { useClickRef } from '@make-software/csprclick-ui';
import { useEffect, useState } from 'react';
import { ActiveAccountType, CsprClickEvent } from '../../types';

const useCsprClick = () => {
	const clickRef = useClickRef();
	const [activeAccount, setActiveAccount] =
		useState<ActiveAccountType | null>(null);

	useEffect(() => {
		clickRef?.on(
			'csprclick:signed_in',
			async (evt: CsprClickEvent) => {
				await setActiveAccount(evt.account);
			}
		);
		clickRef?.on(
			'csprclick:switched_account',
			async (evt: CsprClickEvent) => {
				await setActiveAccount(evt.account);
			}
		);
		clickRef?.on('csprclick:signed_out', async () => {
			setActiveAccount(null);
		});
		clickRef?.on('csprclick:disconnected', async () => {
			setActiveAccount(null);
		});
	}, [clickRef?.on]);

	return {
		activeAccount,
	};
};

export default useCsprClick;


## creating provider at root of thee project and wrapping ouur entire app

mport { ClickProvider } from '@make-software/csprclick-ui';
import { CONTENT_MODE, CsprClickInitOptions } from '@make-software/csprclick-core-types';
import App from './App';

const clickOptions: CsprClickInitOptions = {
	appName: config.cspr_click_app_name,
	contentMode: CONTENT_MODE.IFRAME,
	providers: [
		'casper-wallet',
		'ledger',
		'torus-wallet',
		'casperdash',
		'metamask-snap',
		'casper-signer',
	],
	appId: config.cspr_click_app_id,
};

const root = ReactDOM.createRoot(
	document.getElementById('root') as HTMLElement
);
root.render(
	<React.StrictMode>
		<ClickProvider options={clickOptions}>
			<App />
		</ClickProvider>
	</React.StrictMode>
);

## ensure the connnected wallet you create global context/global state to be accssible like this 

	<ActiveAccountContext.Provider value={activeAccount}> <CHILD> 	</ActiveAccountContext.Provider>

## For tx signing 
start by building transaction using capser js sdk  then sign like  this  	const transaction = await preparePlayTransaction(playerPublicKey);

			await window.csprclick.send(
				{Version1: transaction.toJSON()},
				playerPublicKey.toHex(),
				handleTransactionStatusUpdate
			);
