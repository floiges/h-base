import { h, Portal } from './h';
import render from './render';

// const dynamicClass = ['class-b', 'class-c'];

// const elementVnode = h(
// 	'div',
// 	{
// 		style: {
// 			height: '100px',
// 			width: '100px',
// 			background: 'red',
// 		},
// 		class: ['class-a', dynamicClass],
// 	},
// 	h('div', {
// 		style: {
// 			height: '50px',
// 			width: '50px',
// 			background: 'green',
// 		},
// 	}),
// );

// render(elementVnode, document.getElementById('app'));

// function handler() {
// 	alert('click me');
// }

// const elementVnode = h('input', {
// 	class: 'class-a',
// 	type: 'checkbox',
// 	checked: false,
// 	custom: '1',
// 	onclick: handler,
// });
// render(elementVnode, document.getElementById('app'));

// const elementVnode = h(
// 	'div',
// 	{
// 		style: {
// 			height: '100px',
// 			width: '100px',
// 			background: 'red',
// 		},
// 	},
// 	h(Portal, { target: '#portal-box' }, [h('span', null, 'xcxcxc')]),
// );

// render(elementVnode, document.getElementById('app'));

// class MyComponent {
// 	render() {
// 		return h(
// 			'div',
// 			{
// 				style: {
// 					height: '100px',
// 					width: '100px',
// 					background: 'red',
// 				},
// 			},
// 			[h('span', null, 'sdas')],
// 		);
// 	}
// }

// const compVnode = h(MyComponent);
// console.log("compVnode", compVnode);
// render(compVnode, document.getElementById('app'));

function MyFunctionalComponent() {
	return h(
		'div',
		{
			style: {
				width: '100px',
				height: '100px',
				background: 'red',
			},
		},
		[h('span', null, 'xxxxx')],
	);
}
const compVnode = h(MyFunctionalComponent);
render(compVnode, document.getElementById('app'));
