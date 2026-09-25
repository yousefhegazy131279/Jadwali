export type TourStep = {
  path: string
  selector: string
  title: string
  description: string
  action: 'wait' | 'click' | 'input' | 'select'
  actionTarget?: string
  autoNextPath?: string
  autoNextPathPrefix?: string
  required?: boolean
  skipNavigation?: boolean
}

// جولة مفاهيمية قصيرة تشرح وظيفة كل مساحة وتترك للمستخدم حرية التجربة.
export const tourSteps: TourStep[] = [
  { path: '/dashboard', selector: '[data-tour="dashboard-header"]', title: 'مرحبًا بك في جَدْوَلِي', description: 'هذه لوحة التحكم الرئيسية. من هنا ترى ملخص يومك، عدد المهام، الجلسات المتبقية، والجداول القادمة. استخدم القائمة الجانبية للتنقل بين أقسام التطبيق.', action: 'wait' },
  { path: '/dashboard/planner', selector: 'h1', title: 'المخطط الذكي: ابدأ من هنا', description: 'اكتب عنوان الجدول وتاريخه ووقت البدء، ثم أضف مهامك ومددها. يمكنك اختيار مشروع ومواقيع الصلاة وإعدادات بومودورو قبل إنشاء الجدول. كما يمكنك طلب اقتراح من Jadwool ثم مراجعته قبل استخدامه.', action: 'wait' },
  { path: '/dashboard/schedule', selector: 'h1', title: 'الجداول والجلسات', description: 'هنا تجد كل جداولك مرتبة حسب التاريخ. افتح أي جدول لرؤية مراحله وصلواته وأعماله الجانبية، ثم ابدأ جلسة التركيز من المرحلة المناسبة.', action: 'wait' },
  { path: '/dashboard/workspace', selector: 'h1', title: 'مساحة المهام', description: 'تعرض هذه الصفحة المهام في مكان واحد. تابع المهام المكتملة والمتبقية، ونظّم العمل حتى لو لم يكن مرتبطًا بجدول محدد.', action: 'wait' },
  { path: '/dashboard/projects', selector: 'h1', title: 'المشاريع', description: 'أنشئ مشروعًا لكل هدف أو مادة، ثم اربط به أكثر من جدول. ستشاهد عدد الجداول والمهام ونسبة الإنجاز الخاصة بكل مشروع.', action: 'wait' },
  { path: '/dashboard/shared', selector: 'h1', title: 'الجداول المشتركة', description: 'شارك جدولًا مع مستخدم آخر بدور مشاهد أو محرر. المشاهد يتابع التقدم، والمحرر يستطيع إنجاز جلسات العمل. يظهر إنجاز كل عضو في بطاقة المساهمات.', action: 'wait' },
  { path: '/dashboard/analytics', selector: 'h1', title: 'الإحصائيات', description: 'راجع جلساتك المكتملة وساعات التركيز ونسبة إنجاز المهام. بدّل بين العرض اليومي والأسبوعي، وافتح جدول البيانات لقراءة الأرقام بالتفصيل.', action: 'wait' },
  { path: '/dashboard/settings', selector: 'h1', title: 'الإعدادات والتخصيص', description: 'من هنا تحفظ اسمك ومواقيت الصلاة وإعدادات جلسات التركيز، وتبدّل اللغة بين العربية والإنجليزية والثيم بين الداكن والفاتح. اضغط حفظ التغييرات لتطبيق الإعدادات على الجداول الجديدة.', action: 'wait' },
]
