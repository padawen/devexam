export default function LoadingModal({ isOpen, text }: { isOpen: boolean, text: string }) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl p-8 shadow-2xl flex flex-col items-center justify-center max-w-sm w-full mx-4 animate-in zoom-in-95 duration-300">
                <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                <p className="text-slate-700 font-medium text-lg text-center">{text}</p>
            </div>
        </div>
    );
}
