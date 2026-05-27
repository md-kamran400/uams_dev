import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Save, X } from 'lucide-react';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import MediaField from '../shared/MediaField';
import { api } from '../../lib/api';
import { User } from '../../types';

interface EngineerFormWizardProps {
  user: User;
  asset: any;
  utilityType: any;
  onClose: () => void;
  onComplete: () => void;
}

export default function EngineerFormWizard({ user, asset, utilityType, onClose, onComplete }: EngineerFormWizardProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form Schema State
  const [formConfig, setFormConfig] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [mappings, setMappings] = useState<any[]>([]);
  const [fields, setFields] = useState<any[]>([]);

  // Wizard State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  useEffect(() => {
    async function loadForm() {
      try {
        const [formsList, fullUt] = await Promise.all([
          api.utilityTypes.listForms(utilityType.id),
          api.utilityTypes.getFull(utilityType.id),
        ]);

        // Find the default engineer form
        const form = formsList.find((f: any) => f.isDefault && f.scope === 'engineer') || formsList[0];
        
        if (form) {
          setFormConfig(form);
          const formFull = await api.utilityTypes.getFormFull(utilityType.id, form.id);
          const formSections = formFull.sections.sort((a: any, b: any) => a.sortOrder - b.sortOrder);
          setSections(formSections);
          setMappings(formFull.sections.flatMap((s: any) => s.fields));
          setFields(fullUt.fields || []);
        }
      } catch (e) {
        console.error('Failed to load form schema:', e);
      } finally {
        setIsLoading(false);
      }
    }
    loadForm();
  }, [utilityType.id]);

  const currentSection = sections[currentStepIndex];
  const currentSectionFields = currentSection 
    ? mappings
        .filter(m => m.sectionId === currentSection.id)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map(m => fields.find(f => f.id === m.fieldId))
        .filter(Boolean)
    : [];

  const handleInputChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors(prev => {
        const newErrs = { ...prev };
        delete newErrs[fieldId];
        return newErrs;
      });
    }
  };

  const validateCurrentStep = () => {
    const newErrs: Record<string, string> = {};
    let isValid = true;

    currentSectionFields.forEach(f => {
      const val = formData[f.id];
      const isEmpty = val === undefined || val === '' || (Array.isArray(val) && val.length === 0);
      if (f.required && isEmpty) {
        newErrs[f.id] = (f.type === 'photo' || f.type === 'video')
          ? `Please add at least one ${f.type}`
          : 'This field is required';
        isValid = false;
      }
    });

    setErrors(newErrs);
    return isValid;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStepIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setCurrentStepIndex(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;
    
    setIsSubmitting(true);
    try {
      // Create submission
      const submissionPayload = {
        utilityTypeId: utilityType.id,
        assetId: asset.id,
        formId: formConfig?.id,
        operatorId: user.id,
        shift: user.shift || 'A',
        values: formData,
        status: 'Submitted',
        date: new Date().toISOString().split('T')[0],
      };
      
      await api.submissions.create(submissionPayload as any);
      setSubmissionError(null);
      onComplete();
    } catch (e: any) {
      console.error('Submission failed:', e);
      setSubmissionError(e.message || 'Failed to submit form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500 font-medium">Loading form schema...</p>
        </div>
      </div>
    );
  }

  if (!formConfig || sections.length === 0) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <X size={32} />
          </div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">No Form Configured</h2>
          <p className="text-gray-500 mb-6">There is no engineer form configured for {utilityType.name}. Please contact your administrator.</p>
          <Button variant="primary" className="w-full justify-center" onClick={onClose}>Go Back</Button>
        </div>
      </div>
    );
  }

  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === sections.length - 1;
  const progressPercent = ((currentStepIndex) / sections.length) * 100;

  const renderField = (field: any) => {
    const val = formData[field.id] || '';
    const error = errors[field.id];

    // Photo / video evidence — rendered with its own label inside MediaField
    if (field.type === 'photo' || field.type === 'video') {
      const ids: string[] = Array.isArray(formData[field.id]) ? formData[field.id] : [];
      return (
        <MediaField
          key={field.id}
          kind={field.type}
          fieldName={field.name}
          required={field.required}
          value={ids}
          onChange={(next) => handleInputChange(field.id, next)}
          error={error}
        />
      );
    }

    return (
      <div key={field.id} className="mb-6">
        <label className="block text-sm md:text-base font-semibold text-gray-800 mb-2">
          {field.name} {field.required && <span className="text-red-500">*</span>}
        </label>

        {field.type === 'dropdown' ? (
          <div className="flex flex-wrap gap-3">
            {(field.options || []).map((opt: string) => (
              <button
                key={opt}
                onClick={() => handleInputChange(field.id, opt)}
                className={`px-4 py-3 rounded-xl border-2 text-sm md:text-base font-medium transition-all ${val === opt ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white text-gray-600 hover:border-blue-200'}`}
              >
                {opt}
              </button>
            ))}
          </div>
        ) : field.type === 'boolean' ? (
          <div className="flex gap-4">
             <button
                onClick={() => handleInputChange(field.id, 'Yes')}
                className={`flex-1 py-4 rounded-xl border-2 text-base font-bold transition-all ${val === 'Yes' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-600 hover:border-green-200'}`}
              >
                Yes / OK
              </button>
              <button
                onClick={() => handleInputChange(field.id, 'No')}
                className={`flex-1 py-4 rounded-xl border-2 text-base font-bold transition-all ${val === 'No' ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-200 bg-white text-gray-600 hover:border-red-200'}`}
              >
                No / Issue
              </button>
          </div>
        ) : field.type === 'number' ? (
           <div className="relative">
             <input
              type="number"
              value={val}
              onChange={e => handleInputChange(field.id, e.target.value)}
              className={`w-full p-4 text-lg border-2 rounded-xl focus:outline-none transition-all ${error ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'} ${field.unit ? 'pr-16' : ''}`}
              placeholder={`Enter ${field.name.toLowerCase()}...`}
            />
            {field.unit && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">
                {field.unit}
              </div>
            )}
           </div>
        ) : (
          <input
            type="text"
            value={val}
            onChange={e => handleInputChange(field.id, e.target.value)}
            className={`w-full p-4 text-lg border-2 rounded-xl focus:outline-none transition-all ${error ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
            placeholder={`Enter ${field.name.toLowerCase()}...`}
          />
        )}
        
        {error && <p className="text-red-500 text-sm mt-1.5 font-medium">{error}</p>}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col md:flex-row">
      {/* Sidebar for Desktop / Header for Mobile */}
      <div className="bg-slate-900 text-white md:w-80 flex-shrink-0 flex flex-col">
        <div className="p-4 md:p-6 border-b border-slate-800 flex items-center justify-between">
           <div>
             <Badge variant="info" className="bg-blue-500/20 text-blue-300 border-blue-500/30 mb-2">{utilityType.name}</Badge>
             <h2 className="text-xl font-bold">{asset.name || asset.assetTag}</h2>
           </div>
           <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-800 transition-colors md:hidden">
             <X size={24} />
           </button>
        </div>
        
        <div className="flex-1 p-4 md:p-6 overflow-y-auto hidden md:block">
           <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-700 before:to-transparent hidden md:block">
             {sections.map((sec, idx) => {
               const isActive = idx === currentStepIndex;
               const isCompleted = idx < currentStepIndex;
               return (
                 <div key={sec.id} className="relative flex items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm z-10 shrink-0 shadow-lg border-2 ${isActive ? 'bg-blue-600 border-blue-400 text-white' : isCompleted ? 'bg-green-500 border-green-400 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                      {isCompleted ? <CheckCircle2 size={16} /> : idx + 1}
                    </div>
                    <div className="ml-4">
                      <p className={`font-semibold ${isActive ? 'text-white' : 'text-slate-400'}`}>{sec.name}</p>
                    </div>
                 </div>
               );
             })}
           </div>
        </div>
        
        <div className="p-4 border-t border-slate-800 hidden md:block">
          <Button variant="outline" className="w-full justify-center border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white" onClick={onClose}>
            Cancel Task
          </Button>
        </div>
      </div>

      {/* Main Wizard Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-gray-50">
        {/* Mobile Progress Bar */}
        <div className="h-1.5 bg-gray-200 md:hidden w-full">
           <div className="h-full bg-blue-600 transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-10 lg:p-16">
          <div className="max-w-2xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStepIndex}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                <div className="mb-8">
                  <h2 className="text-2xl md:text-3xl font-extrabold text-gray-800">{currentSection.name}</h2>
                  <p className="text-gray-500 mt-2 text-sm md:text-base">{currentSection.description}</p>
                </div>

                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
                  {currentSectionFields.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">No fields in this section.</div>
                  ) : (
                    currentSectionFields.map(field => renderField(field))
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 md:p-6 bg-white border-t border-gray-200">
          <div className="max-w-2xl mx-auto flex flex-col gap-4">
            {submissionError && (
              <div className="w-full p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm font-medium">
                {submissionError}
              </div>
            )}
            <div className="flex items-center justify-between gap-4 w-full">
              <Button
                variant="outline"
                size="lg"
                className="flex-1 md:flex-none justify-center"
                onClick={isFirstStep ? onClose : handlePrev}
              >
                {isFirstStep ? <><X size={18} className="mr-2" /> Cancel</> : <><ChevronLeft size={18} className="mr-2" /> Previous</>}
              </Button>
              
              <Button
                variant="primary"
                size="lg"
                className={`flex-1 md:flex-none justify-center ${isLastStep ? 'bg-green-600 hover:bg-green-700 border-green-700' : ''}`}
                onClick={isLastStep ? handleSubmit : handleNext}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <><Loader2 size={18} className="animate-spin mr-2" /> Submitting...</>
                ) : isLastStep ? (
                  <><Save size={18} className="mr-2" /> Submit Form</>
                ) : (
                  <>Next Step <ChevronRight size={18} className="ml-2" /></>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
