

"use client";

import { useFormContext } from "react-hook-form";
import { FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input, type InputProps } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, UploadCloud, X } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Checkbox } from "@/components/ui/checkbox";

interface FormInputProps extends InputProps {
  name: string;
  label: string;
  description?: string;
}

export const FormInput = ({ name, label, description, ...props }: FormInputProps) => (
  <FormField
    name={name}
    render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <FormControl>
          <Input {...props} {...field} value={field.value ?? ''} />
        </FormControl>
        {description && <FormDescription>{description}</FormDescription>}
        <FormMessage />
      </FormItem>
    )}
  />
);

interface FormCheckboxProps {
  name: string;
  label: string;
}

export const FormCheckbox = ({ name, label }: FormCheckboxProps) => (
    <FormField
        name={name}
        render={({ field }) => (
             <FormItem className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                    <Checkbox
                        id={name}
                        checked={field.value}
                        onCheckedChange={field.onChange}
                    />
                </FormControl>
                <FormLabel htmlFor={name} className="font-normal">
                    {label}
                </FormLabel>
            </FormItem>
        )}
    />
);


interface FormSelectProps {
  name: string;
  label: string;
  placeholder: string;
  options: { value: string; label: string }[] | readonly string[];
  description?: string;
  disabled?: boolean;
}

export const FormSelect = ({ name, label, placeholder, options, description, disabled }: FormSelectProps) => (
  <FormField
    name={name}
    render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <Select onValueChange={field.onChange} defaultValue={field.value} disabled={disabled}>
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem
                key={typeof opt === 'string' ? opt : opt.value}
                value={typeof opt === 'string' ? opt : opt.value}
              >
                {typeof opt === 'string' ? opt : opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {description && <FormDescription>{description}</FormDescription>}
        <FormMessage />
      </FormItem>
    )}
  />
);


interface FormDatePickerProps {
  name: string;
  label: string;
  description?: string;
}

export const FormDatePicker = ({ name, label, description }: FormDatePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const minDate = new Date(1900, 0, 1);
  const today = new Date();
  const maxBirthDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());

  return (
    <FormField
      name={name}
      render={({ field }) => (
        <FormItem className="flex flex-col">
          <FormLabel>{label}</FormLabel>
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <FormControl>
                <Button
                  variant={"outline"}
                  className={cn(
                    "pl-3 text-left font-normal",
                    !field.value && "text-muted-foreground"
                  )}
                >
                  {field.value ? (
                    format(field.value, "PPP", { locale: es })
                  ) : (
                    <span>Selecciona día, mes y año</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </FormControl>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                captionLayout="dropdown"
                startMonth={minDate}
                endMonth={maxBirthDate}
                defaultMonth={field.value ?? maxBirthDate}
                selected={field.value}
                onSelect={(date) => {
                  field.onChange(date);
                  if (date) setIsOpen(false);
                }}
                disabled={(date) => date > maxBirthDate || date < minDate}
                initialFocus
                locale={es}
                labels={{
                  labelMonthDropdown: () => "Mes",
                  labelYearDropdown: () => "Año",
                }}
              />
            </PopoverContent>
          </Popover>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export const FormBirthDatePicker = ({ name, label, description }: FormDatePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const today = new Date();
  const minDate = new Date(1940, 0, 1);
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  const months = Array.from({ length: 12 }, (_, i) => ({
    value: i.toString(),
    label: new Date(2024, i, 1).toLocaleDateString("es", { month: "long" }),
  }));

  const yearOptions: { value: string; label: string }[] = [];
  for (let y = todayYear - 18; y >= 1940; y--) {
    yearOptions.push({ value: y.toString(), label: y.toString() });
  }

  return (
    <FormField
      name={name}
      render={({ field }) => {
        const initialMonth = field.value
          ? (() => {
              const d = new Date(field.value);
              const max = new Date(todayYear - 18, todayMonth, todayDay);
              return d > max ? max : d < minDate ? minDate : d;
            })()
          : new Date(todayYear - 18, todayMonth, todayDay);

        const [viewDate, setViewDate] = useState<Date>(initialMonth);

        useEffect(() => {
          if (!field.value) return;
          const d = new Date(field.value);
          const max = new Date(todayYear - 18, todayMonth, todayDay);
          if (d <= max && d >= minDate) {
            setViewDate(d);
          }
          // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [field.value]);

        const handleMonthChange = (v: string) => {
          const m = parseInt(v);
          let y = viewDate.getFullYear();
          const candidate = new Date(y, m, 1);
          const max = new Date(todayYear - 18, todayMonth, todayDay);
          if (candidate > max) y = max.getFullYear();
          else if (candidate < new Date(1940, 0, 1)) y = 1940;
          setViewDate(new Date(y, m, 1));
        };

        const handleYearChange = (v: string) => {
          const y = parseInt(v);
          const max = new Date(todayYear - 18, todayMonth, todayDay);
          const m = y === max.getFullYear() && viewDate.getMonth() > max.getMonth()
            ? max.getMonth()
            : viewDate.getMonth();
          setViewDate(new Date(y, m, 1));
        };

        const maxBirth = new Date(todayYear - 18, todayMonth, todayDay);

        return (
          <FormItem className="flex flex-col">
            <FormLabel>{label}</FormLabel>
            <Popover open={isOpen} onOpenChange={(open) => {
              if (open && field.value) {
                const d = new Date(field.value);
                const max = new Date(todayYear - 18, todayMonth, todayDay);
                setViewDate(d > max ? max : d < minDate ? minDate : d);
              }
              setIsOpen(open);
            }}>
              <PopoverTrigger asChild>
                <FormControl>
                  <Button
                    variant="outline"
                    className={cn(
                      "pl-3 text-left font-normal",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {field.value ? (
                      format(field.value, "dd 'de' MMMM, yyyy", { locale: es })
                    ) : (
                      <span>Selecciona tu fecha de nacimiento</span>
                    )}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </FormControl>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="flex items-center gap-1 p-3 pb-0">
                  <Select value={viewDate.getMonth().toString()} onValueChange={handleMonthChange}>
                    <FormControl>
                      <SelectTrigger className="h-9 flex-1 capitalize">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[200px]">
                      {months.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={viewDate.getFullYear().toString()} onValueChange={handleYearChange}>
                    <FormControl>
                      <SelectTrigger className="h-9 w-24">
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[200px]">
                      {yearOptions.map((y) => (
                        <SelectItem key={y.value} value={y.value}>
                          {y.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Calendar
                  mode="single"
                  month={viewDate}
                  onMonthChange={setViewDate}
                  startMonth={minDate}
                  endMonth={maxBirth}
                  selected={field.value}
                  onSelect={(date) => {
                    field.onChange(date);
                    if (date) setIsOpen(false);
                  }}
                  disabled={(date) => date > maxBirth || date < minDate}
                  initialFocus
                  locale={es}
                  classNames={{ caption_label: "hidden", nav: "px-3" }}
                />
              </PopoverContent>
            </Popover>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};

export const FormFutureDatePicker = ({ name, label, description }: FormDatePickerProps) => (
  <FormField
    name={name}
    render={({ field }) => (
      <FormItem className="flex flex-col">
        <FormLabel>{label}</FormLabel>
        <Popover>
          <PopoverTrigger asChild>
            <FormControl>
              <Button
                variant={"outline"}
                className={cn(
                  "pl-3 text-left font-normal",
                  !field.value && "text-muted-foreground"
                )}
              >
                {field.value ? (
                  format(field.value, "PPP", { locale: es })
                ) : (
                  <span>Selecciona una fecha</span>
                )}
                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
              </Button>
            </FormControl>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              captionLayout="dropdown"
              startMonth={new Date(new Date().getFullYear(), 0)}
              endMonth={new Date(new Date().getFullYear() + 10, 11)}
              defaultMonth={field.value ?? new Date()}
              mode="single"
              selected={field.value}
              onSelect={field.onChange}
              disabled={(date) => date < new Date()}
              initialFocus
              locale={es}
               labels={{
                labelMonthDropdown: () => "Mes",
                labelYearDropdown: () => "Año",
              }}
            />
          </PopoverContent>
        </Popover>
        {description && <FormDescription>{description}</FormDescription>}
        <FormMessage />
      </FormItem>
    )}
  />
);

interface FormFileUploadProps {
  name: string;
  label: string;
  description?: string;
  accept?: string;
}

export const FormFileUpload = ({ name, label, description, accept = "image/jpeg,image/png,application/pdf" }: FormFileUploadProps) => {
    const { control, watch, setValue, formState: { errors } } = useFormContext();
    const watchedValue = watch(name);
    const [preview, setPreview] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = React.useRef<HTMLInputElement | null>(null);
    
    useEffect(() => {
        if (typeof watchedValue === 'string') {
            setPreview(watchedValue);
            setFileName(watchedValue.split('/').pop() || null);
        } else if (watchedValue instanceof FileList && watchedValue.length > 0) {
            const file = watchedValue[0];
            setFileName(file.name);
            if (file.type.startsWith('image/')) {
              const reader = new FileReader();
              reader.onloadend = () => setPreview(reader.result as string);
              reader.readAsDataURL(file);
            } else {
              setPreview(null);
            }
        } else {
            setPreview(null);
            setFileName(null);
        }
    }, [watchedValue]);


    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setValue(name, e.target.files, { shouldValidate: true });
    }

    const handleRemove = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setValue(name, null, { shouldValidate: true });
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }

    const handleDragEvents = (e: React.DragEvent<HTMLLabelElement>, isEntering: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(isEntering);
    };
    
    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        handleDragEvents(e, false);
        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles && droppedFiles.length > 0) {
            const dataTransfer = new DataTransfer();
            dataTransfer.items.add(droppedFiles[0]);
            setValue(name, dataTransfer.files, { shouldValidate: true });
            if (inputRef.current) {
                inputRef.current.files = dataTransfer.files;
            }
        }
    };
    
    const hasError = !!errors[name];

    return (
        <FormField
            name={name}
            control={control}
            render={({ field: { ref, onBlur } }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                        <div className="relative">
                            <label 
                                htmlFor={name}
                                className={cn(
                                    "border-2 border-dashed rounded-lg p-6 flex flex-col justify-center items-center cursor-pointer transition-colors",
                                    isDragging ? "border-primary bg-primary/10" : "hover:border-primary hover:bg-slate-50",
                                    hasError ? "border-destructive" : "border-slate-300"
                                )}
                                onDragEnter={(e) => handleDragEvents(e, true)}
                                onDragOver={(e) => handleDragEvents(e, true)}
                                onDragLeave={(e) => handleDragEvents(e, false)}
                                onDrop={handleDrop}
                            >
                                <Input
                                    type="file"
                                    className="hidden"
                                    id={name}
                                    accept={accept}
                                    ref={(e) => {
                                        ref(e);
                                        inputRef.current = e;
                                    }}
                                    onChange={handleFileChange}
                                    onBlur={onBlur}
                                    value={undefined}
                                />
                                <UploadCloud className="h-8 w-8 text-slate-400 mb-2"/>
                                <span className="text-sm text-center text-slate-500">
                                    {fileName ? "Archivo seleccionado:" : "Haz clic o arrastra un archivo aquí"}
                                </span>
                                {fileName && <span className="font-medium text-sm text-slate-700 mt-1">{fileName}</span>}
                            </label>
                            {fileName && (
                                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={handleRemove}>
                                    <X className="h-4 w-4"/>
                                </Button>
                            )}
                        </div>
                    </FormControl>
                    {description && <FormDescription>{description}</FormDescription>}
                    <FormMessage />
                </FormItem>
            )}
        />
    );
};

interface FormImageUploadProps {
  name: string;
  label: string;
  description?: string;
  aspectRatio?: 'square' | 'video';
}

function sanitizePreviewUrl(value: string | null | undefined) {
    if (!value) {
        return null;
    }

    const normalized = value.trim().replace(/^"+|"+$/g, "").replace(/^'+|'+$/g, "");
    if (!normalized) {
        return null;
    }

    if (
        normalized.startsWith("data:") ||
        normalized.startsWith("blob:") ||
        normalized.startsWith("/") ||
        normalized.startsWith("http://") ||
        normalized.startsWith("https://")
    ) {
        return normalized;
    }

    return null;
}

export const FormImageUpload = ({ name, label, description, aspectRatio = 'square' }: FormImageUploadProps) => {
    const { control, watch, setValue, formState: { errors } } = useFormContext();
    const watchedValue = watch(name);
    const [preview, setPreview] = useState<string | null>(null);
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
        let file: File | null = null;
        if (watchedValue instanceof FileList && watchedValue.length > 0) {
            file = watchedValue[0];
        } else if (watchedValue instanceof File) {
            file = watchedValue;
        }

        if (typeof watchedValue === 'string') {
            setPreview(sanitizePreviewUrl(watchedValue));
        } else if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setPreview(null);
        }
    }, [watchedValue]);


    const handleRemove = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setValue(name, null, { shouldValidate: true });
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
    
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        setValue(name, e.target.files, { shouldValidate: true });
      } else {
        setValue(name, null, { shouldValidate: true });
      }
    };

    const hasError = !!errors[name];

    return (
        <FormField
            name={name}
            control={control}
            render={({ field: { ref, onBlur } }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                        <label 
                            htmlFor={name}
                            className={cn(
                                "relative group block w-full cursor-pointer rounded-lg border-2 border-dashed flex items-center justify-center bg-slate-50 overflow-hidden",
                                aspectRatio === 'square' ? "aspect-square" : "aspect-video",
                                "hover:border-primary transition-colors",
                                hasError ? "border-destructive" : "border-slate-300"
                            )}
                        >
                            <Input
                                type="file"
                                className="hidden"
                                id={name}
                                accept="image/jpeg,image/png"
                                ref={(e) => {
                                    ref(e);
                                    inputRef.current = e;
                                }}
                                onBlur={onBlur}
                                onChange={handleFileChange}
                                value={undefined}
                            />
                            {preview ? (
                                <>
                                    <Image src={preview} alt="Vista previa" layout="fill" objectFit="cover" />
                                    <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={handleRemove}>
                                        <X className="h-4 w-4"/>
                                    </Button>
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </>
                            ) : (
                                <div className="text-center p-4">
                                    <UploadCloud className="mx-auto h-8 w-8 text-slate-400 mb-2"/>
                                    <span className="text-sm text-slate-500">Subir imagen</span>
                                </div>
                            )}
                        </label>
                    </FormControl>
                    {description && <FormDescription>{description}</FormDescription>}
                    <FormMessage />
                </FormItem>
            )}
        />
    );
}


interface SingleImageDropzoneProps {
    name: string;
    label: string;
}

const SingleImageDropzone = ({ name, label }: SingleImageDropzoneProps) => {
  const { control, watch, setValue, formState: { errors } } = useFormContext();
  const watchedValue = watch(name);
  const [preview, setPreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  useEffect(() => {
     if (typeof watchedValue === 'string') {
        setPreview(sanitizePreviewUrl(watchedValue));
    } else if (watchedValue instanceof FileList && watchedValue.length > 0) {
        const file = watchedValue[0];
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result as string);
        reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  }, [watchedValue]);

  const handleRemove = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setValue(name, null, { shouldValidate: true });
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(name, e.target.files, { shouldValidate: true });
  };
  
  const handleDragEvents = (e: React.DragEvent<HTMLLabelElement>, isEntering: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(isEntering);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    handleDragEvents(e, false);
    const dataTransfer = new DataTransfer();
    if (e.dataTransfer.files?.[0]) {
      dataTransfer.items.add(e.dataTransfer.files[0]);
      setValue(name, dataTransfer.files, { shouldValidate: true });
      if (inputRef.current) inputRef.current.files = dataTransfer.files;
    }
  };

  const hasError = !!errors[name];

  return (
    <FormField
      name={name}
      control={control}
      render={({ field: { ref, onBlur } }) => (
        <FormItem className="space-y-1">
          <FormLabel className="text-sm">{label}</FormLabel>
          <FormControl>
            <label
              htmlFor={name}
              className={cn(
                "relative group block w-full cursor-pointer rounded-lg border-2 border-dashed flex items-center justify-center bg-slate-50 overflow-hidden aspect-video transition-colors",
                isDragging ? "border-primary bg-primary/10" : "hover:border-primary",
                hasError ? "border-destructive" : "border-slate-300"
              )}
              onDragEnter={(e) => handleDragEvents(e, true)}
              onDragOver={(e) => handleDragEvents(e, true)}
              onDragLeave={(e) => handleDragEvents(e, false)}
              onDrop={handleDrop}
            >
              <Input
                type="file"
                id={name}
                className="hidden"
                accept="image/jpeg,image/png"
                ref={(e) => { ref(e); inputRef.current = e; }}
                onChange={handleFileChange}
                onBlur={onBlur}
                value={undefined}
              />
              {preview ? (
                <>
                  <Image src={preview} alt={`Vista previa de ${label}`} layout="fill" objectFit="cover" />
                  <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={handleRemove}>
                    <X className="h-3 w-3"/>
                  </Button>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                </>
              ) : (
                <div className="text-center p-2">
                  <UploadCloud className="mx-auto h-6 w-6 text-slate-400 mb-1"/>
                  <span className="text-xs text-slate-500">Subir foto</span>
                </div>
              )}
            </label>
          </FormControl>
          <FormMessage className="text-xs"/>
        </FormItem>
      )}
    />
  );
};


interface FormMultiImageUploadProps {
  label: string;
  description?: string;
}

export const FormMultiImageUpload = ({ label, description }: FormMultiImageUploadProps) => {
    return (
        <fieldset>
            <legend className="text-base font-medium mb-2">{label}</legend>
            {description && <p className="text-sm text-muted-foreground mb-4">{description}</p>}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <SingleImageDropzone name="motoPhotoFront" label="Frontal" />
                <SingleImageDropzone name="motoPhotoBack" label="Trasera" />
                <SingleImageDropzone name="motoPhotoLeft" label="Lado Izquierdo" />
                <SingleImageDropzone name="motoPhotoRight" label="Lado Derecho" />
            </div>
        </fieldset>
    );
};
