import { VNodeFlags, ChildrenFlags } from './flags';
import { createTextVNode } from './h';
/**
 * 所谓渲染器，简单的说就是将 Virtual DOM 渲染成特定平台下真实 DOM 的工具(就是一个函数，通常叫 render)，
 * 渲染器的工作流程分为两个阶段：mount 和 patch，
 * 如果旧的 VNode 存在，则会使用新的 VNode 与旧的 VNode 进行对比，试图以最小的资源开销完成 DOM 的更新，这个过程就叫 patch，或“打补丁”。
 * 如果旧的 VNode 不存在，则直接将新的 VNode 挂载成全新的 DOM，这个过程叫做 mount。
 * 之所以说渲染器的责任非常之大，是因为它不仅仅是一个把 VNode 渲染成真实 DOM 的工具，它还负责以下工作：
 * 控制部分组件生命周期钩子的调用
 *   在整个渲染周期中包含了大量的 DOM 操作、组件的挂载、卸载，控制着组件的生命周期钩子调用的时机。
 * 多端渲染的桥梁
 *   渲染器也是多端渲染的桥梁，自定义渲染器的本质就是把特定平台操作“DOM”的方法从核心算法中抽离，并提供可配置的方案。
 * 与异步渲染有直接关系
 *   Vue3 的异步渲染是基于调度器的实现，若要实现异步渲染，组件的挂载就不能同步进行，DOM的变更就要在合适的时机，一些需要在真实DOM存在之后才能执行的操作(如 ref)也应该在合适的时机进行。
 *   对于时机的控制是由调度器来完成的，但类似于组件的挂载与卸载以及操作 DOM 等行为的入队还是由渲染器来完成的，这也是为什么 Vue2 无法轻易实现异步渲染的原因。
 * 包含最核心的 Diff 算法
 *   Diff 算法是渲染器的核心特性之一，可以说正是 Diff 算法的存在才使得 Virtual DOM 如此成功。
 */
export default function render(vnode, container) {
	const prevVNode = container.vnode;
	if (prevVNode == null) {
		if (vnode) {
			// 不存在旧的 VNode，使用 mount 挂载全新的 VNode
			mount(vnode, container);
			// 将新的 VNode 添加到 container.vnode
			container.vnode = vnode;
		}
	} else {
		if (vnode) {
			// 存在旧的 VNode，使用 patch 函数打补丁
			patch(prevVNode, vnode, container);
			container.vnode = vnode;
		} else {
			// 存在旧的 VNode，但不存在新的 VNode，则应该移除 DOM
			container.removeChild(prevVNode.el);
			container.vnode = null;
		}
	}
}

function mount(vnode, container, isSVG) {
	const { flags } = vnode;
	if (flags & VNodeFlags.ELEMENT) {
		// 挂载普通标签
		mountElement(vnode, container, isSVG);
	} else if (flags & VNodeFlags.COMPONENT) {
		// 挂载组件
		mountComponent(vnode, container, isSVG);
	} else if (flags & VNodeFlags.TEXT) {
		// 挂载纯文本
		mountText(vnode, container);
	} else if (flags & VNodeFlags.FRAGMENT) {
		// 挂载 Fragment
		mountFragment(vnode, container, isSVG);
	} else if (flags & VNodeFlags.PORTAL) {
		// 挂载 portal
		mountPortal(vnode, container, isSVG);
	}
}

/**
 * 严谨地处理 SVG 标签，我们使用 document.createElement 函数创建DOM元素，
 * 但是对于 SVG 标签，更加严谨的方式是使用 document.createElementNS 函数
 */

/**
 * setAttribute 方法允许我们为 DOM 元素设置自定义属性（不会初始化同名的 property）。
 * 另外该方法也允许我们为 DOM 元素设置标准属性的值，所以我们可不可以总是使用 setAttribute 设置全部的 DOM 属性呢？答案是：不行
 * checkboxEl.setAttribute('checked', false)
 * // 等价于
 * checkboxEl.setAttribute('checked', 'false')
 * 这就指引我们有些属性不能通过 setAttribute 设置，而是应该直接通过 DOM 元素设置：el.checked = true。
 * 好在这样的属性不多，我们可以列举出来：value、checked、selected、muted。
 * 除此之外还有一些属性也需要使用 Property 的方式设置到 DOM 元素上，例如 innerHTML 和 textContent 等等
 */
/**
 * 正则 domPropsRE 除了用来匹配我们前面说过的固定的几个属性之外，它还能匹配那些拥有大写字母的属性，这是为了匹配诸如 innerHTML、textContent 等属性设计的，
 * 同时这也顺便实现了一个特性，即拥有大写字母的属性我们都会采用 el[key] = xxx 的方式将其添加到 DOM 元素上
 */
const domPropsRE = /\[A-Z]|^(?:value|checked|selected|muted)$/;
function mountElement(vnode, container, isSVG) {
	isSVG = isSVG || vnode.flags & VNodeFlags.ELEMENT_SVG;
	const el = isSVG
		? document.createElementNS('http://www.w3.org/2000/svg', vnode.tag)
		: document.createElement(vnode.tag);
	vnode.el = el; // 引用真实 dom 元素
	// 这种 VNodeData
	const data = vnode.data;
	if (data) {
		for (let key in data) {
			switch (key) {
				case 'style': // 设置样式
					for (let k in data.style) {
						el.style[k] = data.style[k];
					}
					break;
				case 'class':
					if (isSVG) {
						el.setAttribute('class', data[key]);
					} else {
						el.className = data[key];
					}
					break;
				default:
					if (key[0] === 'o' && key[1] === 'n') {
						// 以 on 开头的作文事件处理
						el.addEventListener(key.slice(2), data[key]);
					} else if (domPropsRE.test(key)) {
						// 当作 DOM Prop 处理
						el[key] = data[key];
					} else {
						// 当做 Attr 处理
						el.setAttribute(key, data[key]);
					}
					break;
			}
		}
	}

	// 继续挂载子节点
	const childFlags = vnode.childFlags;
	const children = vnode.children;
	if (childFlags !== ChildrenFlags.NO_CHILDREN) {
		if (childFlags & ChildrenFlags.SINGLE_VNODE) {
			// 单个子节点
			// 这里需要把 isSVG 传递下去，这样我们就能达到一个目的
			// 即使 <circle/> 标签对应的 vnode.flags 不是 VNodeFlags.ELEMENT_SVG，但在 mountElement 函数看来它依然是 svg 标签
			mount(children, el, isSVG);
		} else if (childFlags & ChildrenFlags.MULTIPLE_VNODES) {
			// 多个子节点
			for (let i = 0; i < children.length; i++) {
				mount(children[i], el, isSVG);
			}
		}
	}

	container.appendChild(el);
}

function mountText(vnode, container) {
	const el = document.createTextNode(vnode.children);
	vnode.el = el;
	container.appendChild(el);
}

/**
 * 对于 Fragment 类型的 VNode 的挂载，就等价于只挂载一个 VNode 的 children
 * 因为 Fragment 不会渲染成真实的 DOM 元素
 * 对于 Fragment 类型的 VNode 来说，当它被渲染为真实DOM之后，其 el 属性的引用是谁呢？
 * 这需要根据片段中节点的数量来决定，如果只有一个节点，那么 el 属性就指向该节点；
 * 如果有多个节点，则 el 属性值是第一个节点的引用；
 * 如果片段中没有节点，即空片段，则 el 属性引用的是占位的空文本节点元素
 * 那么这样设计有什么意义呢？
 * 这是因为在 patch 阶段对DOM元素进行移动时，应该确保将其放到正确的位置，而不应该始终使用 appendChild 函数，有时需要使用 insertBefore 函数，
 * 这时候我们就需要拿到相应的节点引用，这时候 vnode.el 属性是必不可少的，就像上面的代码中即使 Fragment 没有子节点我们依然需要一个占位的空文本节点作为位置的引用。
 */
function mountFragment(vnode, container, isSVG) {
	const { children, childFlags } = vnode;
	switch (childFlags) {
		case ChildrenFlags.SINGLE_VNODE:
			// 单个子节点
			mount(children, container, isSVG);
			vnode.el = children.el;
			break;
		case ChildrenFlags.NO_CHILDREN:
			// 没有子节点，等于挂载空片段，会创建一个空的文本节点占位
			const placeholder = createTextVNode('');
			mountText(placeholder, container);
			vnode.el = placeholder.el;
			break;
		default:
			// 多个子节点
			for (let i = 0; i < children.length; i++) {
				mount(children[i], container, isSVG);
			}
			vnode.el = children[0].el;
	}
}

/**
 * 实现 Portal 的关键是要将其 VNode 的 children 中所包含的子 VNode 挂载到 tag 属性所指向的挂载点
 * 虽然 Portal 所描述的内容可以被挂载到任何位置，但仍然需要一个占位元素，并且 Portal 类型的 VNode 其 el 属性应该指向该占位元素，
 * 为什么这么设计呢？这是因为 Portal 的另外一个特性：虽然 Portal 的内容可以被渲染到任意位置，但它的行为仍然像普通的DOM元素一样，
 * 如事件的捕获/冒泡机制仍然按照代码所编写的DOM结构实施。
 * 要实现这个功能就必须需要一个占位的DOM元素来承接事件。
 * 但目前来说，我们用一个空的文本节点占位即可
 */
function mountPortal(vnode, container) {
  const { tag, children, childFlags } = vnode;

  // 获取挂载点
  const target = typeof tag === 'string' ? document.querySelector(tag) : tag;
  if (childFlags & ChildrenFlags.SINGLE_VNODE) {
    // 将children 挂载到 target 上，而不是 container
    mount(children, target);
  } else if (childFlags & ChildrenFlags.MULTIPLE_VNODES) {
    for (let i = 0; i < children.length; i++) {
      mount(children[i], target);
    }
  }

  // 占位的空文本节点
  const plageholder = createTextVNode('');
  // 将占位节点挂载到 container
  mountText(plageholder, container);
  // el 属性引用该占位节点
  vnode.el = plageholder.el;
}

function mountComponent(vnode, container, isSVG) {
  if (vnode.flags & VNodeFlags.COMPONENT_STATEFUL) {
    // 挂载有状态组件
    mountStatefulComponent(vnode, container, isSVG);
  } else {
    // 挂载函数式组件
    mountFunctionalComponent(vnode, container, isSVG);
  }
}

function mountStatefulComponent(vnode, container, isSVG) {
  // 如果一个 VNode 描述的是有状态组件，那么 vnode.tag 属性值就是组件类的引用，所以通过 new 关键字创建组件实例
  const instance = new vnode.tag();
  // 一个组件的核心就是其 render 函数，通过调用 render 函数可以拿到该组件要渲染的内容
  instance.$vnode = instance.render();
  // 挂载
  mount(instance.$vnode, container, isSVG);
  // el 属性和组件实例的 $el 属性都引用组件的根 DOM 元素
  instance.$el = vnode.el = instance.$vnode.el;
}

/**
 * 在挂载函数式组件的时候，比挂载有状态组件少了一个实例化的过程，如果一个 VNode 描述的是函数式组件，那么其 tag 属性值就是该函数的引用
 */
function mountFunctionalComponent(vnode, container, isSVG) {
  // 获取 VNode
  const $vnode = vnode.tag();
  // 挂载
  mount($vnode, container, isSVG);
  // el 引用该组件的根元素
  vnode.el = $vnode.el;
}