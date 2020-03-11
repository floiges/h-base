import { h, Fragment, Portal } from './h';
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

// const handler = () => alert('clicked');

// const prevVNode = h('div', {
// 	style: {
// 		width: '100px',
// 		height: '100px',
// 		backgroundColor: 'red',
// 	},
// 	onclick: handler,
// });

// const nextVNode = h('div', {
// 	style: {
// 		width: '50px',
// 		height: '100px',
// 		border: '1px solid red',
// 	},
// });

// render(prevVNode, document.getElementById('app'));

// setTimeout(() => {
// 	render(nextVNode, document.getElementById('app'));
// }, 3000);

// const prevVNode = h('div', null, [
//   h('p', null, '旧的子节点信息1'),
//   h('p', null, '旧的子节点信息2')
// ])

// const nextVNode = h('div', null, [
//   h('p', null, '新的子节点信息1'),
//   h('p', null, '新的子节点信息2')
// ])

// render(prevVNode, document.getElementById('app'));

// setTimeout(() => {
//   render(nextVNode, document.getElementById('app'));
// }, 3000);

// const prevVNode = h(Fragment, null, [
//   h('p', null, '旧片段子节点1'),
//   h('p', null, '旧片段子节点2')
// ]);

// const nextVNode = h(Fragment, null, [
//   h('p', null, '新片段子节点1'),
//   h('p', null, '新片段子节点2')
// ]);

// render(prevVNode, document.getElementById('app'));

// setTimeout(() => {
//   render(nextVNode, document.getElementById('app'));
// }, 3000);

const prevVNode = h(
	Portal,
	{ target: '#old-container' },
	h('p', null, '旧的 Portal'),
);

const nextVNode = h(
	Portal,
	{ target: '#new-container' },
	h('p', null, '新的 Portal'),
);
console.log('nextVNode', nextVNode);

render(prevVNode, document.getElementById('app'));

setTimeout(() => {
	render(nextVNode, document.getElementById('app'));
}, 2000);
