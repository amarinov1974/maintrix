import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Assign Technician Modal (S1)
 */
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workOrdersAPI } from '../../../api/work-orders';
import { apiClient } from '../../../api/client';
import { useSession } from '../../../contexts/SessionContext';
import { Button } from '../../../components/shared';
export function AssignTechnicianModal({ workOrderId, onClose, }) {
    const { session } = useSession();
    const queryClient = useQueryClient();
    const [selectedTechId, setSelectedTechId] = useState('');
    const [etaDate, setEtaDate] = useState(() => {
        const d = new Date();
        return d.toISOString().slice(0, 10); // YYYY-MM-DD
    });
    const [etaTime, setEtaTime] = useState('09:00'); // 30-min increment
    // 30-minute increments: 00:00, 00:30, 01:00, ... 23:30
    const timeOptions = Array.from({ length: 48 }, (_, i) => {
        const h = Math.floor(i / 2);
        const m = (i % 2) * 30;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    });
    const { data: _workOrder, isLoading: loadingWO } = useQuery({
        queryKey: ['work-order', workOrderId],
        queryFn: () => workOrdersAPI.getById(workOrderId),
    });
    const { data: technicians, isLoading: loadingTechs } = useQuery({
        queryKey: ['technicians', session?.companyId],
        queryFn: async () => {
            const { data } = await apiClient.get('/auth/users/vendor');
            return (data.users ?? []).filter((u) => u.role === 'S2' && u.vendorCompanyId === session?.companyId);
        },
        enabled: session?.companyId != null,
    });
    const assignMutation = useMutation({
        mutationFn: workOrdersAPI.assignTechnician,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['work-orders'] });
            onClose();
        },
    });
    const handleAssign = () => {
        if (!selectedTechId || !etaDate || !etaTime)
            return;
        const [hours, minutes] = etaTime.split(':').map(Number);
        const combined = new Date(etaDate);
        combined.setHours(hours, minutes, 0, 0);
        if (Number.isNaN(combined.getTime()))
            return;
        assignMutation.mutate({
            workOrderId,
            technicianUserId: parseInt(selectedTechId, 10),
            eta: combined.toISOString(),
        });
    };
    if (loadingWO || loadingTechs) {
        return (_jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50", children: _jsx("div", { className: "bg-white rounded-lg p-6", children: _jsx("p", { children: "U\u010Ditavanje..." }) }) }));
    }
    return (_jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50", children: _jsxs("div", { className: "bg-white rounded-lg max-w-2xl w-full", children: [_jsx("div", { className: "p-6 border-b border-gray-200", children: _jsxs("h2", { className: "text-2xl font-bold text-gray-900", children: ["Dodjela tehni\u010Dara \u2014 RN #", workOrderId] }) }), _jsxs("div", { className: "p-6 space-y-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Tehni\u010Dar *" }), _jsxs("select", { value: selectedTechId, onChange: (e) => setSelectedTechId(e.target.value), className: "w-full p-3 border border-gray-300 rounded-lg", children: [_jsx("option", { value: "", children: "-- Odaberi tehni\u010Dara --" }), technicians?.map((tech) => (_jsx("option", { value: tech.id, children: tech.name }, tech.id)))] })] }), _jsxs("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-4", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Datum dolaska *" }), _jsx("input", { type: "date", value: etaDate, onChange: (e) => setEtaDate(e.target.value), className: "w-full p-3 border border-gray-300 rounded-lg" })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Vrijeme dolaska * \u2014 u intervalima 30 min (npr. 18:00, 18:30)" }), _jsx("select", { value: etaTime, onChange: (e) => setEtaTime(e.target.value), className: "w-full p-3 border border-gray-300 rounded-lg", children: timeOptions.map((t) => (_jsx("option", { value: t, children: t }, t))) })] })] })] }), _jsxs("div", { className: "p-6 border-t border-gray-200 flex gap-3", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: onClose, children: "Odustani" }), _jsx(Button, { type: "button", onClick: handleAssign, disabled: !selectedTechId || !etaDate || !etaTime || assignMutation.isPending, className: "flex-1", children: assignMutation.isPending ? 'Dodjela...' : 'Dodijeli' })] }), assignMutation.isError && (_jsx("div", { className: "px-6 pb-6", children: _jsxs("p", { className: "text-red-600 text-sm", children: ["Error:", ' ', assignMutation.error?.response?.data?.error ??
                                'Failed to assign'] }) }))] }) }));
}
