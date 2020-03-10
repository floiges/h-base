/**
 * VNode 种类
// html 元素节点
const htmlVnode = {
  flags: VNodeFlags.ELEMENT_HTML,
  tag: 'div',
  data: null
}

// svg 元素节点
const svgVnode = {
  flags: VNodeFlags.ELEMENT_SVG,
  tag: 'svg',
  data: null
}

// 函数式组件
const functionalComponentVnode = {
  flags: VNodeFlags.COMPONENT_FUNCTIONAL,
  tag: MyFunctionalComponent
}

// 普通的有状态组件
const normalComponentVnode = {
  flags: VNodeFlags.COMPONENT_STATEFUL_NORMAL,
  tag: MyStatefulComponent
}

// Fragment
const fragmentVnode = {
  flags: VNodeFlags.FRAGMENT,
  // 注意，由于 flags 的存在，我们已经不需要使用 tag 属性来存储唯一标识
  tag: null
}

// Portal
const portalVnode = {
  flags: VNodeFlags.PORTAL,
  // 注意，由于 flags 的存在，我们已经不需要使用 tag 属性来存储唯一标识，tag 属性用来存储 Portal 的 target
  tag: target
}
 */

import { VNodeFlags, ChildrenFlags } from './flags';

// Frament 并不是一个真实的 DOM，而是一个抽象的标识
// 当渲染器在渲染 VNode 时，发现该 VNode 的类型是 Fragment，只需把该 VNode 的子节点渲染到页面
// 对于 Fragment 类型的 VNode，它的 tag 属性值为 null，但是纯文本类型 VNode 的 tag 属性值也是 null
// 因此，为了区分，增加一个唯一标识来确定 Fragment
export const Fragment = Symbol();

// Portal 运行把内容渲染到任何地方
// 对于Portal 类型的 VNode，它的 tag 属性值也可以是字符串，这就会与普通标签元素类型的 VNode 冲突，导致无法区分一个 VNode 到底是普通标签元素还是 Portal，
// 所以我们参考 Fragment 的实现方式，增加一个 Portal 标识
export const Portal = Symbol();

export function h(tag, data = null, children = null) {
	// VNode 创建时确定其类型：flags
	let flags = null;
	if (typeof tag === 'string') {
		flags = tag === 'svg' ? VNodeFlags.ELEMENT_SVG : VNodeFlags.ELEMENT_HMLT;
		if (data) {
			// 序列化 class
			data.class = normalizedClass(data.class);
		}
	} else if (tag === Fragment) {
		flags = VNodeFlags.FRAGMENT;
	} else if (tag === Portal) {
		flags = VNodeFlags.PORTAL;
		tag = data && data.target;
	} else {
		// 兼容 Vue2 的对象式组件
		if (tag !== null && typeof tag === 'object') {
			flags = tag.functional
				? VNodeFlags.COMPONENT_FUNCTIONAL
				: VNodeFlags.COMPONENT_STATEFUL_NORMAL;
		} else if (typeof tag === 'function') {
			// Vue3 的类组件
			flags =
				tag.prototype && tag.prototype.render
					? VNodeFlags.COMPONENT_STATEFUL_NORMAL
					: VNodeFlags.COMPONENT_FUNCTIONAL;
		}
	}

	// VNode 创建时确定其 children 类型： childFlags
	let childFlags = null;
	if (Array.isArray(children)) {
		const { length } = children;
		if (length === 0) {
			// 没有 children
			childFlags = ChildrenFlags.NO_CHILDREN;
		} else if (length === 1) {
			// 单个子节点
			childFlags = ChildrenFlags.SINGLE_VNODE;
			children = children[0];
		} else {
			// 多个子节点，且子节点使用 key
			childFlags = ChildrenFlags.KEYED_VNODES;
			children = normalizedVNodes(children);
		}
	} else if (children == null) {
		// 没有子节点
		childFlags = ChildrenFlags.NO_CHILDREN;
	} else if (children._isVNode) {
		// 单个子节点
		childFlags = ChildrenFlags.SINGLE_VNODE;
	} else {
		// 其他情况视为文本节点，即当子节点，会用 createTextVNode 创建文本类型的 VNode
		childFlags = ChildrenFlags.SINGLE_VNODE;
		children = createTextVNode(children + '');
	}

	// 返回 VNode 对象
	return {
		_isVNode: true, // 一直为 true,判断一个对象是否是 VNode 对象
		flags,
		tag,
		data,
		children,
		childFlags,
		el: null, // 当一个 VNode 被渲染为真实 DOM 之后，el 属性的值会引用该真实DOM
	};
}

function normalizedVNodes(children) {
	const newChildren = [];
	for (let i = 0; i < children.length; i++) {
		let child = children[i];
		// if (typeof child === 'string') { // 判断是字符串时，则表示是纯文本，则先创建纯文本对应的 VNode
		// 	child = createTextVNode(child);
		// }
		if (child.key == null) {
			// 若原来的 VNode 没有 key， 则使用竖线与该 VNode 在数组中的编号拼接作为 key
			child.key = '|' + i;
		}
		newChildren.push(child);
	}
	// 返回新的 children，此时 children 的类型就是 ChildrenFlags.KEYED_VNODES
	return newChildren;
}

function normalizedClass(classValue) {
	// res 是最终要返回的类目字符串
	let res = '';
	if (typeof classValue === 'string') {
		res = classValue;
	} else if (Array.isArray(classValue)) {
		for (let i = 0; i < classValue.length; i++) {
			res += normalizedClass(classValue[i]) + ' ';
		}
	} else if (typeof classValue === 'object') {
		for (const name in classValue) {
			if (classValue[name]) {
				res += name + ' ';
			}
		}
	}
	return res.trim();
}

export function createTextVNode(text) {
	return {
		_isVNode: true,
		flags: VNodeFlags.TEXT, // 文本节点
		tag: null,
		data: null,
		children: text, // 纯文本类型的 vnode，其 children 属性存储与之相符的文本内容
		childFlags: ChildrenFlags.NO_CHILDREN, // 无子节点
	};
}
