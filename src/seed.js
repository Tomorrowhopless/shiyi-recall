// Legacy examples are used only to recognize untouched cards in older backups.
// New installations and upgrades receive the classified mathematics library.
import { createCard } from './core.js';

const examples = [
  ['math', '导数的乘积法则是什么？', '$(uv)\' = u\'v + uv\'$。', '两项都要分别求导，不能只把两个导数相乘。', ['微积分','导数']],
  ['math', '复合函数的链式求导法则是什么？', '若 $y=f(g(x))$，则 $y\' = f\'(g(x))g\'(x)$。', '先对外层求导，再乘内层导数。', ['微积分','导数']],
  ['math', '分部积分公式是什么？', '$\\int u\\,dv = uv - \\int v\\,du$。', '由乘积求导法则积分得到；选择能简化问题的 u 与 dv。', ['微积分','积分']],
  ['math', '函数在某点可导，能推出它在该点连续吗？反过来呢？', '可导一定连续；连续不一定可导。', '反例：$f(x)=|x|$ 在 $x=0$ 连续，但左右导数不同。', ['微积分','概念']],
  ['math', '矩阵乘积的转置公式是什么？', '$(AB)^T = B^T A^T$。', '注意乘法顺序要反过来，且矩阵尺寸应相容。', ['线性代数','矩阵']],
  ['math', '在二维平面中，向量点积与夹角有什么关系？', '$\\mathbf a\\cdot\\mathbf b=|\\mathbf a||\\mathbf b|\\cos\\theta$。', '两个非零向量点积为 0，当且仅当它们互相垂直。', ['线性代数','向量']],
  ['math', '当 $x\\to0$ 时，$\\frac{\\sin x}{x}$ 的极限是 {{c1::1}}，其中 $x$ 用弧度表示。', '', '角度单位是这一结论的必要约定。', ['微积分','极限'], 'cloze'],
  ['physics', '真空中的库仑定律如何写？', '$F=\\frac{1}{4\\pi\\varepsilon_0}\\frac{|q_1q_2|}{r^2}$。', '适用于真空中静止点电荷；力沿两电荷连线，同号相斥、异号相吸。', ['电磁学','静电场']],
  ['physics', '电场强度的定义是什么？', '$\\mathbf E=\\lim_{q_0\\to0}\\frac{\\mathbf F}{q_0}$。', '取正试探电荷确定方向；试探电荷应足够小，不显著改变原电场。单位为 N/C 或 V/m。', ['电磁学','静电场']],
  ['physics', '洛伦兹力的完整表达式是什么？', '$\\mathbf F=q(\\mathbf E+\\mathbf v\\times\\mathbf B)$。', '磁力部分垂直于速度，因此磁场力不对点电荷做功。', ['电磁学','带电粒子']],
  ['physics', '法拉第电磁感应定律的积分形式是什么？', '$\\oint_{C}\\mathbf E\\cdot d\\mathbf l=-\\frac{d}{dt}\\int_{S}\\mathbf B\\cdot d\\mathbf S$。', '这里 C 为固定闭合回路，S 是以它为边界的固定曲面；方向按右手规则关联。负号体现楞次定律。', ['电磁学','电磁感应']],
  ['physics', '电容的定义是什么？', '$C=\\frac{Q}{U}$。', '对线性电容器，Q 为一极板所带电荷量的大小，U 为两极板间电势差的大小。单位为法拉 F。', ['电磁学','电容']],
  ['physics', '动量定理如何表述？', '$\\Delta\\mathbf p=\\int_{t_1}^{t_2}\\mathbf F_{\\mathrm{net}}\\,dt$。', '物体所受合外力的冲量等于其动量变化；合外力恒定时为 $\\Delta\\mathbf p=\\mathbf F_{\\mathrm{net}}\\Delta t$。', ['力学','动量']],
  ['physics', '简谐运动中，回复加速度满足 $a=$ {{c1::$-\\omega^2 x$}}。', '', 'x 是相对平衡位置的位移；负号表示加速度始终指向平衡位置。', ['力学','振动'], 'cloze'],
  ['english', 'account for 的两个常见意思是什么？', '① 解释、说明；②（在数量或比例上）占。', 'How do you account for the result? 你如何解释这个结果？\nOnline sales account for 30% of revenue. 线上销售占收入的 30%。', ['词组','考研']],
  ['english', 'distinguish A from B 是什么意思？', '区分 A 和 B。', 'We must distinguish facts from opinions. 我们必须区分事实和观点。', ['词组','考研']],
  ['english', 'be consistent with 是什么意思？', '与……一致；与……相符。', 'The results are consistent with the theory. 结果与理论相符。', ['词组','学术英语']],
  ['english', 'contribute to 有哪些常见意思？', '促成、导致；为……作出贡献；向……投稿或捐助。', 'Regular practice contributes to progress. 经常练习有助于进步。\nto 是介词，后接名词或动名词。', ['词组','考研']],
  ['english', 'retain /rɪˈteɪn/ 是什么意思？', 'v. 保留；保持；记住。', 'Spaced practice helps us retain information. 间隔练习有助于我们记住所学内容。', ['单词','记忆']],
  ['english', 'evaluate /ɪˈvæljueɪt/ 是什么意思？', 'v. 评价；评估。', 'Evaluate the evidence before drawing a conclusion. 在下结论之前评估证据。', ['单词','学术英语']],
  ['english', 'We should take the cost {{c1::into}} account before making a decision.', 'take … into account：考虑到……。', '完整句意：我们在作决定前应该考虑成本。', ['词组','填空'], 'cloze'],
];

export function seedCards(now = new Date()) {
  return examples.map(([subject,front,back,notes,tags,kind], index) => ({
    ...createCard({ subject, front, back, notes, tags, kind: kind || 'basic' }, now),
    id: `example-v1-${subject}-${index + 1}`,
  }));
}
export const SEED_COUNT = examples.length;
