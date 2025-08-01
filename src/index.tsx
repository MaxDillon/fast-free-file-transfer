/* @refresh reload */
import { render } from 'solid-js/web';
import App from './App';
import './index.css'; // Tailwind CSS entry point

render(() => <App />, document.getElementById('root') as HTMLElement);
