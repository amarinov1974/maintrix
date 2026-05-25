import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/**
 * Create Ticket Modal
 */
import { useState, useEffect, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ticketsAPI } from '../../api/tickets';
import { useSession } from '../../contexts/SessionContext';
import { Button } from '../../components/shared';
// Must match Prisma TicketCategory enum keys exactly
const CATEGORIES = [
    { value: 'ELECTRICAL_INSTALLATIONS', label: 'Elektroinstalacije' },
    { value: 'HEATING_VENTILATION_AIR_CONDITIONING', label: 'Grijanje, ventilacija i klima' },
    { value: 'REFRIGERATION', label: 'Rashlađivanje' },
    { value: 'KITCHEN_EQUIPMENT', label: 'Kuhinjska oprema' },
    { value: 'ELEVATORS', label: 'Liftovi' },
    { value: 'AUTOMATIC_DOORS', label: 'Automatska vrata' },
    { value: 'FIRE_PROTECTION_SYSTEM', label: 'Zaštita od požara' },
    { value: 'WATER_AND_SEWAGE', label: 'Vodoopskrba i kanalizacija' },
    { value: 'CONSTRUCTION_WORKS', label: 'Građevinski radovi' },
    { value: 'HYGIENE', label: 'Higijena' },
    { value: 'ENVIRONMENTAL', label: 'Okoliš' },
    { value: 'OTHER', label: 'Ostalo' },
];
export function CreateTicketModal({ onClose }) {
    const { session } = useSession();
    const queryClient = useQueryClient();
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [urgent, setUrgent] = useState(false);
    const [showSuccess, setShowSuccess] = useState(null);
    const [isSending, setIsSending] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [validationError, setValidationError] = useState('');
    const [submitError, setSubmitError] = useState('');
    const onCloseRef = useRef(onClose);
    const fileInputRef = useRef(null);
    onCloseRef.current = onClose;
    const createMutation = useMutation({
        mutationFn: ticketsAPI.create,
    });
    const isBusy = createMutation.isPending || isSending;
    useEffect(() => {
        if (showSuccess == null)
            return;
        const t = setTimeout(() => {
            onCloseRef.current();
        }, 2000);
        return () => clearTimeout(t);
    }, [showSuccess]);
    const validate = () => {
        setValidationError('');
        if (!category.trim()) {
            setValidationError('Odaberite kategoriju.');
            return false;
        }
        if (!description.trim()) {
            setValidationError('Unesite opis kvara.');
            return false;
        }
        return true;
    };
    const uploadFilesToTicket = async (ticketId) => {
        for (const file of selectedFiles) {
            await ticketsAPI.uploadAttachment(ticketId, file, false);
        }
    };
    const handleSaveDraft = async () => {
        setSubmitError('');
        if (session?.storeId == null || !validate())
            return;
        try {
            const ticket = await createMutation.mutateAsync({
                storeId: session.storeId,
                category,
                description,
                urgent,
            });
            if (selectedFiles.length > 0) {
                await uploadFilesToTicket(ticket.id);
            }
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            setShowSuccess('draft');
        }
        catch {
            // Error shown via createMutation.isError
        }
    };
    const handleSend = async () => {
        setSubmitError('');
        if (session?.storeId == null || !validate())
            return;
        setIsSending(true);
        try {
            const ticket = await createMutation.mutateAsync({
                storeId: session.storeId,
                category,
                description,
                urgent,
            });
            if (selectedFiles.length > 0) {
                await uploadFilesToTicket(ticket.id);
            }
            try {
                await ticketsAPI.submit(ticket.id);
            }
            catch (err) {
                const msg = err?.response?.data?.error ?? 'Failed to submit ticket';
                setSubmitError(msg);
                return;
            }
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            setShowSuccess('submitted');
        }
        catch {
            // Create error shown via createMutation.isError
        }
        finally {
            setIsSending(false);
        }
    };
    return (_jsx("div", { className: "fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50", children: _jsx("div", { className: "bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto", children: showSuccess != null ? (_jsx("div", { className: "p-8 text-center", children: _jsxs("div", { className: "bg-green-100 border-2 border-green-500 rounded-lg p-6 mb-4", children: [_jsx("p", { className: "text-green-800 font-semibold text-xl mb-2", children: showSuccess === 'draft'
                                ? '✓ Ticket saved in draft.'
                                : '✓ Ticket submitted.' }), _jsx("p", { className: "text-green-700 text-sm", children: "Returning to dashboard in 2 seconds..." })] }) })) : (_jsxs(_Fragment, { children: [_jsx("div", { className: "p-6 border-b border-gray-200", children: _jsx("h2", { className: "text-2xl font-bold text-gray-900", children: "Create New Ticket" }) }), _jsxs("form", { onSubmit: (e) => e.preventDefault(), className: "p-6 space-y-6", children: [_jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Category *" }), _jsxs("select", { value: category, onChange: (e) => setCategory(e.target.value), required: true, className: "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500", children: [_jsx("option", { value: "", children: "-- Select Category --" }), CATEGORIES.map((cat) => (_jsx("option", { value: cat.value, children: cat.label }, cat.value)))] })] }), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Description *" }), _jsx("textarea", { value: description, onChange: (e) => setDescription(e.target.value), required: true, rows: 5, placeholder: "Describe the issue in detail...", className: "w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500" })] }), _jsxs("div", { className: "flex items-center gap-3", children: [_jsx("input", { type: "checkbox", id: "urgent", checked: urgent, onChange: (e) => setUrgent(e.target.checked), className: "w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" }), _jsx("label", { htmlFor: "urgent", className: "text-sm font-medium text-gray-700", children: "Mark as URGENT" })] }), urgent && (_jsx("div", { className: "bg-red-50 border border-red-200 rounded-lg p-4", children: _jsx("p", { className: "text-sm text-red-800", children: "\u26A0\uFE0F Urgent tickets bypass the approval chain and go directly to the Area Maintenance Manager for immediate action." }) })), _jsxs("div", { children: [_jsx("label", { className: "block text-sm font-medium text-gray-700 mb-2", children: "Attachments (optional)" }), _jsx("p", { className: "text-xs text-gray-600 mb-2", children: "Add files or take a photo. On mobile, choosing images may open the camera." }), _jsx("input", { ref: fileInputRef, type: "file", multiple: true, accept: "image/*,.pdf,.doc,.docx,.xls,.xlsx", className: "hidden", onChange: (e) => setSelectedFiles(Array.from(e.target.files ?? [])) }), _jsx(Button, { type: "button", variant: "secondary", size: "sm", onClick: () => fileInputRef.current?.click(), children: "Add files or take photo" }), selectedFiles.length > 0 && (_jsx("ul", { className: "mt-2 text-sm text-gray-600 list-disc list-inside", children: selectedFiles.map((f, i) => (_jsx("li", { children: f.name }, i))) }))] }), _jsxs("div", { className: "flex gap-3 pt-4 border-t border-gray-200", children: [_jsx(Button, { type: "button", variant: "secondary", onClick: onClose, children: "Cancel" }), _jsx(Button, { type: "button", variant: "secondary", onClick: handleSaveDraft, disabled: isBusy, children: createMutation.isPending && !isSending ? 'Saving...' : 'Save as draft' }), _jsx(Button, { type: "button", onClick: handleSend, disabled: isBusy, className: "flex-1", children: isSending ? 'Sending...' : 'Send' })] }), validationError && (_jsx("p", { className: "text-amber-600 text-sm", children: validationError })), createMutation.isError && (_jsxs("p", { className: "text-red-600 text-sm", children: ["Error:", ' ', createMutation.error?.response?.data?.error ??
                                        'Failed to create ticket'] })), submitError && (_jsxs("p", { className: "text-red-600 text-sm", children: ["Error: ", submitError] }))] })] })) }) }));
}
