/** NotaScan. — tipos de dominio y props de componentes (documentación). */
import type { ReactNode, CSSProperties, KeyboardEvent } from "react";

/* ---------- Dominio ---------- */
export type Role = "admin" | "secretary" | "principal" | "teacher" | "student" | "parent";
export type ReviewStatus = "pending" | "verified" | "needs-review";
export type ConfidenceLevel = "high" | "medium" | "low";
/** Porcentaje 0–100 que devuelve el reconocimiento. */
export type ConfidenceScore = number;
export type EnrollmentStatus = "active" | "pending" | "retired" | "archived";
export type DocumentType = "Tarjeta de identidad" | "Registro civil" | "Cédula de ciudadanía" | "Cédula de extranjería" | "Pasaporte";
export interface Guardian { name: string; relationship: string; document?: string; phone: string; email?: string; }
export interface MedicalInfo { allergies?: string; conditions?: string; notes?: string; emergencyContact?: string; emergencyPhone?: string; }
export interface Student { id: string; name: string; first: string; last: string; document: string; docType: DocumentType | string; grade: string; course: string; guardian: string; guardianRel: string; guardianPhone: string; status: EnrollmentStatus; enrolled: string; avg: number; attendance: number; birthDate?: string; medical?: MedicalInfo; }
export interface Enrollment { studentId: string; year: string; gradeLevelId: string; courseId: string; status: EnrollmentStatus; date: string; guardian: Guardian; }
export interface Teacher { id: string; name: string; subjects: string[]; courses: string[]; pending: number; pct: number; last: string; status: "ok" | "warn" | "late"; }
export interface Administrator { id: string; name: string; email: string; area: "Secretaría académica" | "Coordinación" | string; }
export interface Principal { id: string; name: string; email: string; title: "Rector" | "Coordinador académico" | string; }
export interface AppUser { id: string; name: string; email: string; role: "teacher" | "guardian" | "staff" | "director"; status: "active" | "inactive" | "invited"; last: string; }
export interface Subject { id: string; name: string; code: string; category: string; status?: "active" | "archived"; }
export interface GradeLevel { id: string; name: string; level: "Básica primaria" | "Básica secundaria" | "Media"; courses: number; status: "active" | "draft" | "archived"; }
export interface Course { id: string; grade: string; name: string; director: string; students: number; status: "active" | "archived"; }
export interface PeriodWeight { name: string; weight: number; }
export interface AcademicPeriod { id: string; name: string; open: string; close: string; status: "draft" | "open" | "closed"; items: PeriodWeight[]; }
export interface CurriculumAssignment { id: string; teacher: string; subject: string; course: string; period: string; }
export interface Evaluation { id: string; name: string; subject: "Matemáticas" | "Física" | "Lengua Castellana" | "Inglés" | "Ciencias Naturales" | "Tecnología" | string; kind: "examen" | "taller" | "actividad"; weight: number; status: "borrador" | "en-revision" | "cerrada"; }
export interface Grade { studentId: string; detected: number | null; value: number | null; confidence: ConfidenceScore; status: ReviewStatus; }
export interface RecoveryGrade { studentId: string; subject: string; original: number; recovery: number | null; result: "pending" | "passed" | "failed"; }
export type AttendanceState = "present" | "absent" | "late" | "excused";
export interface AttendanceRecord { studentId: string; date: string; state: AttendanceState | null; note?: string; }
export interface BehaviorRecord { date: string; type: "positive" | "neutral" | "attention"; title: string; context: string; by: string; student: string; course: string; }
export type Performance = "Superior" | "Alto" | "Básico" | "Bajo";
export interface ReportCard { studentId: string; period: string; subjects: { subject: string; teacher: string; grade: number; absences: number }[]; average: number; performance: Performance; status: "pending" | "generated" | "blocked"; }
export interface ClearanceStatus { studentId: string; library: boolean; fees: boolean; documents: boolean; /** Derivado: los tres al día. */ access: "enabled" | "blocked"; }
export interface AuthorizationRequest { id: number; teacher: string; student: string; course: string; subject: string; from: number; to: number; reason: string; detail: string; date: string; status: "pending" | "approved" | "rejected"; history: [string, string][]; }
export interface Achievement { id: string; name: string; desc: string; req: string; progress: number; goal: number; state: "unlocked" | "progress" | "locked" | "claimable"; icon: IconName; date?: string; }
export interface Notification { id: number; type: "grade" | "achievement" | "behavior" | "report" | "attendance"; title: string; text: string; time: string; unread: boolean; }
export interface SyncStatus { status: "online" | "syncing" | "offline" | "error"; last: string; pending: number; }
export interface GradeCheck { valid: boolean; value: number; message: string; }
export type IconName = string;

/* ---------- Átomos ---------- */
export interface LogoProps { size?: number; mark?: boolean; markOnly?: boolean; className?: string; }
export interface IconProps { name: IconName; size?: number; label?: string; strokeWidth?: number; className?: string; }
export interface ButtonProps { variant?: "primary" | "secondary" | "ghost" | "danger" | "icon"; size?: "sm" | "md" | "lg"; icon?: IconName; iconRight?: IconName; loading?: boolean; loadingText?: string; success?: boolean; successText?: string; disabled?: boolean; block?: boolean; state?: "hover" | "active" | "focus"; onClick?: () => void; "aria-label"?: string; children?: ReactNode; }
export interface InputProps { label?: string; hideLabel?: boolean; hint?: string; error?: string; id?: string; value?: string; defaultValue?: string; placeholder?: string; disabled?: boolean; readOnly?: boolean; state?: "hover" | "focus"; onChange?: (e: unknown) => void; }
export interface GradeInputProps { label?: string; hideLabel?: boolean; value?: string; defaultValue?: string | number; onChange?: (raw: string, check: GradeCheck) => void; hint?: string; disabled?: boolean; readOnly?: boolean; autoFocus?: boolean; showError?: boolean; onKeyDown?: (e: KeyboardEvent) => void; }
export interface BadgeProps { tone?: "neutral" | "high" | "medium" | "low" | "verified" | "pending" | "review" | "solid"; icon?: IconName | false; title?: string; children?: ReactNode; }
export interface AvatarProps { name: string; src?: string; size?: "sm" | "md" | "lg"; }
export interface DividerProps { variant?: "hairline" | "strong" | "ornament"; label?: string; }
export interface StatusDotProps { status?: "processing" | "success" | "warning" | "error"; label?: string; hideLabel?: boolean; }
export interface ConfidenceIndicatorProps { value: ConfidenceScore; label?: string; showHead?: boolean; showLevel?: boolean; }

/* ---------- Moléculas ---------- */
export interface NavigationItemProps { icon: IconName; label: string; active?: boolean; disabled?: boolean; collapsed?: boolean; count?: number; index?: string; href?: string; state?: "hover"; onClick?: () => void; }
export interface GradeInputGroupProps { detected: number; value?: string; onChange?: (raw: string, check: GradeCheck) => void; label?: string; actions?: ReactNode; autoFocus?: boolean; onKeyDown?: (e: KeyboardEvent) => void; }
export interface ConfidenceBadgeProps { value: ConfidenceScore; compact?: boolean; }
export interface UserProfileProps { name: string; role?: string; src?: string; compact?: boolean; }
export interface SearchFieldProps { value?: string; onChange?: (text: string) => void; placeholder?: string; label?: string; }
export interface FilterOption { value: string; label: string; count?: number; }
export interface FilterGroupProps { label: string; options: FilterOption[]; value?: string; defaultValue?: string; onChange?: (value: string) => void; as?: "chips" | "select"; }
export interface ReviewStatusProps { status: ReviewStatus; label?: string; }
export interface UploadZoneProps { onFiles?: (files: File[]) => void; title?: string; hint?: string; }

/* ---------- Organismos ---------- */
export interface NavEntry { id: string; label: string; icon: IconName; count?: number; disabled?: boolean; }
export interface SidebarProps { active?: string; onNavigate?: (id: string) => void; items?: NavEntry[]; collapsed?: boolean; course?: string; user?: { name: string; role: string }; onClose?: () => void; }
export interface HeaderProps { eyebrow?: string; title: string; description?: string; actions?: ReactNode; tabs?: { value: string; label: string }[]; tab?: string; onTab?: (value: string) => void; }
export interface ReviewSummaryProps { total: number; verified: number; pending: number; review: number; evaluation?: string; }
export interface FiltersBarProps { search?: string; onSearch?: (text: string) => void; placeholder?: string; groups?: FilterGroupProps[]; count?: string; }
export interface StudentGradeCardProps { student: Student; detected: number; confidence: ConfidenceScore; status?: ReviewStatus; onStatusChange?: (s: ReviewStatus) => void; onGradeChange?: (g: number) => void; onConfirm?: (g: number) => void; index?: number; animate?: boolean; editing?: boolean; style?: CSSProperties; }
export interface ReviewStepperProps { current?: 1 | 2 | 3 | 4 | 5 | 6 | 7; steps?: string[]; }
export interface ProcessingPanelProps { step?: 0 | 1 | 2 | 3; simulate?: boolean; file?: string; index?: number; total?: number; studentName?: string; detected?: string; confidence?: number; grade?: string; }
export interface ConfirmDialogProps { open: boolean; count: number; onCancel?: () => void; onConfirm?: () => void; loading?: boolean; note?: string | null; title?: string; description?: string; confirmLabel?: string; inline?: boolean; }
export interface ToastProps { tone?: "success" | "error" | "info"; title: string; message?: string; onClose?: () => void; }
export interface EmptyStateProps { title: string; message?: string; action?: ReactNode; icon?: IconName; tone?: "empty" | "error"; }
export interface DataTableColumn<R> { key: string; label: string; numeric?: boolean; render?: (row: R) => ReactNode; }
export interface DataTableProps<R = Record<string, unknown>> { caption: string; columns: DataTableColumn<R>[]; rows: R[]; }

/* ---------- Plantilla ---------- */
export interface ReviewRow { key: string; index: number; student: Student; detected: number; confidence: ConfidenceScore; status: ReviewStatus; grade: number; }
export interface GradeReviewDashboardProps { rows?: ReviewRow[]; loading?: boolean; inlineDialog?: boolean; style?: CSSProperties; }

/* ---------- Shell y páginas ---------- */
export type Route = string; /* #/rol/página[/id][?tab=] */
export interface PageProps { onNavigate?: (route: Route) => void; onLogout?: () => void; style?: CSSProperties; }
export interface AppShellProps extends PageProps { active: string; pending?: number; course?: string; overlay?: ReactNode; children?: ReactNode; }
export interface LoginPageProps { onLogin?: () => void; style?: CSSProperties; }
export type DashboardPageProps = PageProps;
export type UploadPageProps = PageProps;
export type StudentsPageProps = PageProps;
export type EvaluationsPageProps = PageProps;
export interface ReportsPageProps extends PageProps { inlineToast?: boolean; }
export type DesignSystemPageProps = PageProps;
export interface NotaScanAppProps { initial?: Route; }
export interface StickerProps { tone?: "gold" | "sage" | "navy" | "burgundy" | "paper"; rotate?: number; icon?: IconName; children?: ReactNode; }
export interface MarqueeProps { items?: string[]; label?: string; tone?: "navy" | "gold"; }

/* ---------- Extensión: ecosistema académico ---------- */
export interface SwitchProps { checked: boolean; onChange?: (v: boolean) => void; label?: string; ariaLabel?: string; onText?: string; offText?: string; disabled?: boolean; hideLabel?: boolean; }
export interface CheckboxProps { checked?: boolean; onChange?: (v: boolean) => void; label: string; hideLabel?: boolean; indeterminate?: boolean; disabled?: boolean; }
export interface SelectProps { label: string; options: (string | { value: string; label: string })[]; value?: string; defaultValue?: string; onChange?: (v: string) => void; placeholder?: string; required?: boolean; hint?: string; error?: string | null; disabled?: boolean; }
export interface TextareaProps { label: string; value?: string; defaultValue?: string; onChange?: (v: string) => void; rows?: number; placeholder?: string; required?: boolean; hint?: string | null; error?: string | null; readOnly?: boolean; disabled?: boolean; }
/** Cifra que cuenta desde 0 al montarse. Conserva decimales y sufijo ("3.8", "9%", "112"). */
export interface CountUpProps { value: string | number; animate?: boolean; }
export interface ProgressBarProps { value: number; total: number; label?: string; showValue?: boolean; valueText?: string; tone?: "gold" | "sage" | "burgundy" | "inverse"; }
export interface IconActionProps { icon: IconName; label: string; onClick?: () => void; tone?: "danger"; disabled?: boolean; }
export interface SegmentedTabsProps { tabs: { value: string; label: string; icon?: IconName; count?: number }[]; value: string; onChange: (v: string) => void; label: string; }
export interface ModalProps { open: boolean; onClose?: () => void; title: string; description?: string; icon?: IconName; tone?: "sage" | "burgundy"; alert?: boolean; actions?: ReactNode; size?: "doc"; inline?: boolean; children?: ReactNode; }
export interface DrawerProps { open: boolean; onClose: () => void; title: string; eyebrow?: string; footer?: ReactNode; inline?: boolean; children?: ReactNode; }
export interface DataGridColumn<R> { key: string; label: string; sortable?: boolean; numeric?: boolean; header?: boolean; width?: number | string; className?: string; render?: (row: R) => ReactNode; sortValue?: (row: R) => number | string; }
export interface DataGridProps<R = Record<string, unknown>> { caption: string; columns: DataGridColumn<R>[]; rows: R[]; rowKey?: (row: R) => string; pageSize?: number; paginate?: boolean; selectable?: boolean; bulkActions?: (selected: R[], clear: () => void) => ReactNode; rowActions?: (row: R) => ReactNode; toolbar?: ReactNode; densityToggle?: boolean; density?: "comfortable" | "compact"; initialSort?: { key: string; dir: "asc" | "desc" }; loading?: boolean; error?: string; onRetry?: () => void; emptyTitle?: string; emptyMessage?: string; emptyIcon?: IconName; emptyAction?: ReactNode; resetKey?: string; }
export interface BarChartProps { title: string; subtitle?: string; data: { label: string; value: number; note?: string }[]; max?: number; ticks?: number[]; target?: number; targetLabel?: string; seriesLabel?: string; lowBelow?: number; format?: (v: number) => string; width?: number; height?: number; }
export interface LineChartProps { title: string; subtitle?: string; labels: string[]; series: { name: string; points: number[]; tone?: "navy" | "gold"; dashed?: boolean }[]; min?: number; max?: number; ticks?: number[]; threshold?: number; thresholdLabel?: string; width?: number; height?: number; format?: (v: number) => string; }
export interface DonutChartProps { title: string; subtitle?: string; data: { label: string; value: number; tone: "navy" | "gold" | "sage" }[]; centerValue: string; centerLabel: string; }
export interface ConnectivityStatusProps { status: SyncStatus["status"]; lastSync?: string; pending?: number; onSync?: () => void; onToggleOffline?: (offline: boolean) => void; defaultOpen?: boolean; }
export interface GlobalSearchProps { onOpenStudent?: (s: Student, tab: "profile" | "grades" | "history" | "attendance" | "observer" | "reportcards") => void; }
export interface PasswordResetDialogProps { open: boolean; user: { name: string; email?: string } | null; onClose: () => void; inline?: boolean; }
export interface PeriodWeightEditorProps { items: PeriodWeight[]; onChange: (items: PeriodWeight[]) => void; }
export interface AcademicAssignmentSelectorProps { value: Omit<CurriculumAssignment, "id">; onChange: (v: Omit<CurriculumAssignment, "id">) => void; onSubmit: () => void; error?: string | null; editing?: boolean; }
export interface ReportCardDocumentProps { student: Student; period?: string; compact?: boolean; }
export interface ObserverTimelineProps { items?: BehaviorRecord[]; showStudent?: boolean; compact?: boolean; hideFilter?: boolean; }
export interface RoleShellProps extends PageProps { role: "admin" | "principal" | "teacher"; active: string; counts?: Record<string, number>; overlay?: ReactNode; children?: ReactNode; }
export interface MobileShellProps { role: "student" | "parent"; active: string; onNavigate: (page: string) => void; title?: string | null; back?: (() => void) | null; unread?: number; onLogout?: () => void; overlay?: ReactNode; children?: ReactNode; }
export interface StudentProfilePageProps extends PageProps { studentId?: string; tab?: string; }
export type WidgetKind = "next" | "average" | "streak" | "attendance" | "due" | "goal" | "lastgrade" | "event";
export interface MobileWidgetProps { title: string; icon?: IconName; size?: "s" | "m"; tone?: "navy" | "gold" | "gold-soft" | "sage" | "burgundy"; onClick?: () => void; ariaLabel?: string; editing?: boolean; onRemove?: () => void; children?: ReactNode; }
export interface WidgetBoardProps { role?: "student" | "parent"; title?: string; initial?: WidgetKind[]; editing?: boolean; onNavigate?: (page: string) => void; }
export interface HomeScreenWidgetsProps { role?: "student" | "parent"; style?: CSSProperties; }
export interface StudentAppProps { page?: "home" | "grades" | "performance" | "achievements" | "simulator" | "notifications" | "observer"; onNavigate?: (page: string) => void; onLogout?: () => void; }
export interface ParentAppProps { page?: "home" | "grades" | "attendance" | "observer" | "reportcards" | "notifications"; onNavigate?: (page: string) => void; onLogout?: () => void; }
