/**
 * 一个 VNode 到底描述的是什么是在挂载或 patch 的时候才知道的。
 * 这就带来了两个难题：无法从 AOT 的层面优化、开发者无法手动优化。
 * 为了解决这个问题，我们的思路是在 VNode 创建的时候就把该 VNode 的类型通过 flags 标明
 * 这样在挂载或 patch 阶段通过 flags 可以直接避免掉很多消耗性能的判断
 */

const VNodeFlags = {
	ELEMENT_HMLT: 1, // html 标签
	ELEMENT_SVG: 1 << 1, // svg 标签

	COMPONENT_STATEFUL_NORMAL: 1 << 2, // 普通有状态组件
	COMPONENT_STATEFUL_SHOULD_KEEP_ALIVE: 1 << 3, // 需要被 keepAlive 的有状态组件
	COMPONENT_STATEFUL_KEPT_ALIVE: 1 << 4, // 已经被 keepAlive 的有状态组件
	COMPONENT_FUNCTIONAL: 1 << 5, // 函数式组件

	TEXT: 1 << 6, // 纯文本
	FRAGMENT: 1 << 7, // Fragment
	PORTAL: 1 << 8, // Portal
};

// html 和 svg 都是标签元素，可以用 ELEMENT 表示
VNodeFlags.ELEMENT = VNodeFlags.ELEMENT_HMLT | VNodeFlags.ELEMENT_SVG;
// 普通有状态组件、需要被 keepAlive 的有状态组件、已经被 keepAlive 的有状态组件，都属于有状态组件
VNodeFlags.COMPONENT_STATEFUL =
	VNodeFlags.COMPONENT_STATEFUL |
	VNodeFlags.COMPONENT_STATEFUL_SHOULD_KEEP_ALIVE |
	VNodeFlags.COMPONENT_STATEFUL_KEPT_ALIVE;

// 有状态组件和函数式组件都是组件
VNodeFlags.COMPONENT =
	VNodeFlags.COMPONENT_STATEFUL | VNodeFlags.COMPONENT_FUNCTIONAL;


/**
 * 我们给 VNode 定义了 children 属性，用来存储子 VNode。大家思考一下，一个标签的子节点会有几种情况？
 * 总的来说无非有以下几种：
 * 没有子节点
 * 只有一个子节点
 * 多个子节点
 * 有 key
 * 无 key
 * 不知道子节点的情况
 * 我们可以用一个叫做 ChildrenFlags 的对象来枚举出以上这些情况，作为一个 VNode 的子节点的类型标识
 * 为什么 children 也需要标识呢？原因只有一个：为了优化
 */

const ChildrenFlags = {
	UNKNOWN_CHILDREN: 0, // 未知的 children 类型
	NO_CHILDREN: 1, // 没有 children
	SINGLE_VNODE: 1 << 1, // children 是单个 vnode

	KEYED_VNODES: 1 << 2, // children 是拥有多个 key 的 vnode
	NONE_KEYED_VNODES: 1 << 3, // children 是多个没有 key 的 vnode
};

ChildrenFlags.MULTIPLE_VNODES =
	ChildrenFlags.KEYED_VNODES | ChildrenFlags.NONE_KEYED_VNODES;

export { VNodeFlags, ChildrenFlags };
