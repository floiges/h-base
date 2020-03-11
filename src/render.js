import { VNodeFlags, ChildrenFlags } from './flags';
import { createTextVNode } from './h';
import { patchData } from './patchData';
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
function mountElement(vnode, container, isSVG) {
	isSVG = isSVG || vnode.flags & VNodeFlags.ELEMENT_SVG;
	const el = isSVG
		? document.createElementNS('http://www.w3.org/2000/svg', vnode.tag)
		: document.createElement(vnode.tag);
	vnode.el = el; // 引用真实 dom 元素
	// 处理 VNodeData
	const data = vnode.data;
	if (data) {
		for (let key in data) {
			patchData(el, key, null, data[key]);
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

function patch(prevVNode, nextVNode, container) {
	const nextFlags = nextVNode.flags;
	const prevFlags = prevVNode.flags;

	if (prevFlags !== nextFlags) {
		// 直接替换
		replaceVNode(prevVNode, nextVNode, container);
	} else if (nextFlags & VNodeFlags.ELEMENT) {
		patchElement(prevVNode, nextVNode, container);
	} else if (nextFlags & VNodeFlags.COMPONENT) {
		patchComponent(prevVNode, nextVNode, container);
	} else if (nextFlags & VNodeFlags.TEXT) {
		patchText(prevVNode, nextVNode);
	} else if (nextFlags & VNodeFlags.FRAGMENT) {
		patchFragment(prevVNode, nextVNode, container);
	} else if (nextFlags & VNodeFlags.PORTAL) {
		patchPortal(prevVNode, nextVNode);
	}
}

function replaceVNode(prevVNode, nextVNode, container) {
	// 将旧的 VNode 所渲染的 DOM 从容器中移除
	container.removeChild(prevVNode.el);
	// 挂载新的 VNode
	mount(nextVNode, container);
}

/**
 * 首先即使两个 VNode 的类型同为标签元素，但它们也可能是不同的标签，也就是说它们的 tag 属性值不尽相同。
 * 这就又引申出了一条更新原则：我们认为不同的标签渲染的内容不同，
 * 例如 ul 标签下只能渲染 li 标签，所以拿 ul 标签和一个 div 标签进行比对是没有任何意义的，
 * 这种情况下我们不会对旧的标签元素打补丁，而是使用新的标签元素替换旧的标签元素
 */
function patchElement(prevVNode, nextVNode, container) {
	// 新旧 VNode 描述的标签不同，则直接替换
	if (prevVNode.tag !== nextVNode.tag) {
		replaceVNode(prevVNode, nextVNode, container);
		return;
	}

	// 拿到 el，注意这时要让 nextVNode.el 也引用该元素
	const el = (nextVNode.el = prevVNode.el);
	const prevData = prevVNode.data;
	const nextData = nextVNode.data;

	if (nextData) {
		for (let key in nextData) {
			const prevValue = prevData[key];
			const nextValue = nextData[key];
			patchData(el, key, prevValue, nextValue);
		}
	}
	if (prevData) {
		for (let key in prevData) {
			const prevValue = prevData[key];
			if (prevValue && !nextData.hasOwnProperty(key)) {
				patchData(el, key, prevValue, null);
			}
		}
	}

	// 调用 patchChildren 递归更新子节点
	patchChildren(
		prevVNode.childFlags,
		nextVNode.childFlags,
		prevVNode.children,
		nextVNode.children,
		el,
	);
}

/**
 * 子节点更新
 * @param {*} prevChildFlags 旧 VNode 的子节点类型
 * @param {*} nextChildFlags 新 VNode 的子节点类型
 * @param {*} prevChildren 旧 VNode 的子节点
 * @param {*} nextChildren 新 VNode 的子节点
 * @param {*} container 当前标签元素，即子节点的父元素
 */
function patchChildren(
	prevChildFlags,
	nextChildFlags,
	prevChildren,
	nextChildren,
	container,
) {
	switch (prevChildFlags) {
		case ChildrenFlags.SINGLE_VNODE: // 旧 children 是单个子节点
			switch (nextChildFlags) {
				case ChildrenFlags.SINGLE_VNODE: // 新 children 是单个子节点
					patch(prevChildren, nextChildren, container);
					break;
				case ChildrenFlags.NO_CHILDREN: // 新 children 没有子节点
					container.removeChild(prevChildren.el);
					break;
				default:
					// 新 children 有多个子节点
					container.removeChild(prevChildren.el);
					for (let i = 0; i < nextChildren.length; i++) {
						mount(nextChildren[i], container);
					}
					break;
			}
			break;
		case ChildrenFlags.NO_CHILDREN: // 旧 children 没有子节点
			switch (nextChildFlags) {
				case ChildrenFlags.SINGLE_VNODE:
					mount(nextChildren, container);
					break;
				case ChildrenFlags.NO_CHILDREN:
					break;
				default:
					for (let i = 0; i < nextChildren.length; i++) {
						mount(nextChildren[i], container);
					}
					break;
			}
			break;
		default:
			// 旧 children 有多个子节点
			switch (nextChildFlags) {
				case ChildrenFlags.SINGLE_VNODE:
					for (let i = 0; i < prevChildren.length; i++) {
						container.removeChild(prevChildren[i].el);
					}
					mount(nextChildren, container);
					break;
				case ChildrenFlags.NO_CHILDREN:
					for (let i = 0; i < prevChildren.length; i++) {
						container.removeChild(prevChildren[i].el);
					}
					break;
				default:
					for (let i = 0; i < prevChildren.length; i++) {
						container.removeChild(prevChildren[i].el);
					}
					for (let i = 0; i < nextChildren.length; i++) {
						mount(nextChildren[i], container);
					}
					break;
			}
			break;
	}
}

/**
 * 如果一个 DOM 元素是文本节点或注释节点，那么可以通过调用该 DOM 对象的 nodeValue 属性读取或设置文本节点(或注释节点)的内容
 */
function patchText(prevVNode, nextVNode) {
	// 拿到文本元素 el，同时让 nextVNode.el 指向该文本元素
	const el = (nextVNode.el = prevVNode.el);
	if (prevVNode.children !== nextVNode.children) {
		el.nodeValue = nextVNode.children;
	}
}

/**
 * 如果两个 VNode 的类型都是片段，则 patch 函数会调用 patchFragment 函数更新片段的内容。
 * 实际上片段的更新是简化版的标签元素的更新，我们知道对于标签元素来说更新的过程分为两个步骤：首先需要更新标签本身的 VNodeData，其次更新其子节点。
 * 然而由于 Fragment 没有包裹元素，只有子节点，所以我们对 Fragment 的更新本质上就是更新两个片段的“子节点”
 */
function patchFragment(prevVNode, nextVNode, container) {
	// 直接调用 patchChildren 函数更新 新旧片段的子节点即可
	patchChildren(
		prevVNode.childFlags,
		nextVNode.childFlags,
		prevVNode.children,
		nextVNode.children,
		container,
	);

	// 更新 nextVNode.el 属性
	// 检查新的片段的 children 类型，如果新的片段的 children 类型是单个子节点，则意味着其 vnode.children 属性的值就是 VNode 对象，所以直接将 nextVNode.children.el 赋值给 nextVNode.el 即可。
	// 如果新的片段没有子节点，我们知道对于没有子节点的片段我们会使用一个空的文本节点占位，而 prevVNode.el 属性引用的就是该空文本节点，所以我们直接通过旧片段的 prevVNode.el 拿到该空文本元素并赋值给新片段的 nextVNode.el 即可。
	// 如果新的片段的类型是多个子节点，则 nextVNode.children 是一个 VNode 数组，我们会让新片段的 nextVNode.el 属性引用数组中的第一个元素。实际上这段逻辑与我们在 mountFragment 函数中所实现的逻辑是一致的
	switch (nextVNode.childFlags) {
		case ChildrenFlags.SINGLE_VNODE:
			nextVNode.el = nextVNode.children.el;
			break;
		case ChildrenFlags.NO_CHILDREN:
			nextVNode.el = prevVNode.el;
			break;
		default:
			nextVNode.el = nextVNode.children[0].el;
			break;
	}
}

/**
 *  Portal 的更新与 Fragment 类似，我们需要更新其子节点，
 * 但由于 Portal 可以被到处挂载，所以新旧 Portal 的挂载目标可能不同，所以对于 Portal 的更新除了要更新其子节点之外，还要对比新旧挂载目标是否相同，
 * 如果新的 Portal 的挂载目标变了我们就需要将 Portal 的内容从旧的容器中搬运到新的容器中
 */
function patchPortal(prevVNode, nextVNode) {
	// 需要注意的是 patchChildren 的第五个参数是旧的挂载容器，也就是说即使新的 Portal 的挂载目标变了，但是在这一步的更新完成之后 Portal 的内容仍然存在于旧的容器中
	patchChildren(
		prevVNode.childFlags,
		nextVNode.childFlags,
		prevVNode.children,
		nextVNode.children,
		prevVNode.tag, // 注意容器元素是旧的 container
	);

	// 我们将 prevVNode.el 赋值给 nextVNode.el，这一步要比 Fragment 容易的多，因为我们知道对于 Portal 类型的 VNode 来说其 el 属性始终是一个占位的文本节点
	nextVNode.el = prevVNode.el;

	// 由于我们在更新子节点的过程中，传递给 patchChildren 函数的容器元素始终都是旧的容器元素，
	// 所以最终结果是：更新后的子节点也存在于旧的容器中，所以我们还需要做最后一步工作，就是把旧容器内的元素都搬运到新容器中
	// 如果新旧容器不同，才需要搬运
	if (nextVNode.tag !== prevVNode.tag) {
		// 获取新的容器元素，即挂载目标
		const container =
			typeof nextVNode.tag === 'string'
				? document.querySelector(nextVNode.tag)
				: nextVNode.tag;

		switch (nextVNode.childFlags) {
			case ChildrenFlags.SINGLE_VNODE:
				// 如果新的 Portal 是单个子节点，就把该节点搬运到新容器
				container.appendChild(nextVNode.children.el);
				break;
			case ChildrenFlags.NO_CHILDREN:
				// 无子节点，不需要搬运
				break;
			default:
				for (let i = 0; i < nextVNode.children.length; i++) {
					container.appendChild(nextVNode.children[i].el);
				}
				break;
		}
	}
}
