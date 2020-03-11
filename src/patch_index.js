import { h } from './h';
import render from './render';

// const prevVNode = h('div', null, '旧的 VNode');

// class MyComponent {
//   render() {
//     return h('div', null, '新的 VNode');
//   }
// }
// const nextVNode = h(MyComponent);

// render(prevVNode, document.getElementById('app'));
// render(nextVNode, document.getElementById('app'));

const handler = () => alert('clicked');

const prevVNode = h('div', {
	style: {
		width: '100px',
		height: '100px',
		backgroundColor: 'red',
	},
	onclick: handler,
});

const nextVNode = h('div', {
	style: {
		width: '50px',
		height: '100px',
		border: '1px solid red',
	},
});

render(prevVNode, document.getElementById('app'));

setTimeout(() => {
	render(nextVNode, document.getElementById('app'));
}, 3000);
