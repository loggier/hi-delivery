
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
          <Input {...props} {...field} />
        </FormControl>
        {description && <FormDescription>{description}</FormDescription>}
        <FormMessage />
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

const FormSimpleDateInput = ({ name, label, description }: FormDatePickerProps) => {
  const { control, setValue, watch, trigger } = useFormContext();
  const currentValue = watch(name);

  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  useEffect(() => {
    if (currentValue && currentValue instanceof Date) {
      setDay(String(currentValue.getDate()));
      setMonth(String(currentValue.getMonth() + 1));
      setYear(String(currentValue.getFullYear()));
    }
  }, [currentValue]);
  
  const handleDateChange = (part: 'day' | 'month' | 'year', value: string) => {
    let newDay = part === 'day' ? value : day;
    let newMonth = part === 'month' ? value : month;
    let newYear = part === 'year' ? value : year;

    setDay(newDay);
    setMonth(newMonth);
    setYear(newYear);

    const dayInt = parseInt(newDay, 10);
    const monthInt = parseInt(newMonth, 10);
    const yearInt = parseInt(newYear, 10);

    if (dayInt > 0 && monthInt > 0 && yearInt > 999) {
      const date = new Date(yearInt, monthInt - 1, dayInt);
      // Check if date is valid (e.g. not Feb 30)
      if (date.getFullYear() === yearInt && date.getMonth() === monthInt - 1 && date.getDate() === dayInt) {
        setValue(name, date, { shouldValidate: true });
      } else {
        setValue(name, undefined, { shouldValidate: true });
      }
    } else {
      setValue(name, undefined, { shouldValidate: true });
    }
  };

  return (
    <FormField
      name={name}
      control={control}
      render={() => (
        <FormItem>
          <FormLabel>{label}</FormLabel>
          <div className="grid grid-cols-3 gap-2">
            <Input
              type="number"
              placeholder="DD"
              value={day}
              onChange={(e) => handleDateChange('day', e.target.value)}
              onBlur={() => trigger(name)}
            />
            <Input
              type="number"
              placeholder="MM"
              value={month}
              onChange={(e) => handleDateChange('month', e.target.value)}
               onBlur={() => trigger(name)}
            />
            <Input
              type="number"
              placeholder="AAAA"
              value={year}
              onChange={(e) => handleDateChange('year', e.target.value)}
              onBlur={() => trigger(name)}
            />
          </div>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};


export const FormDatePicker = ({ name, label, description }: FormDatePickerProps) => (
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
              captionLayout="dropdown-buttons"
              fromYear={1950}
              toYear={new Date().getFullYear() - 18}
              mode="single"
              selected={field.value}
              onSelect={field.onChange}
              disabled={(date) =>
                date > new Date() || date < new Date("1900-01-01")
              }
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
              captionLayout="dropdown-buttons"
              fromYear={new Date().getFullYear()}
              toYear={new Date().getFullYear() + 10}
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
    const files: FileList | null = watch(name);
    const file = files?.[0];
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    const handleRemove = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setValue(name, null, { shouldValidate: true });
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
    
    const handleFileChange = (files: FileList | null) => {
      if (files && files.length > 0) {
        setValue(name, files, { shouldValidate: true });
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
        handleFileChange(droppedFiles);
    };
    
    const hasError = !!errors[name];

    return (
        <FormField
            name={name}
            control={control}
            render={({ field: { ref, onChange, onBlur, ...fieldProps } }) => (
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
                                    ref={inputRef}
                                    onChange={(e) => handleFileChange(e.target.files)}
                                    onBlur={onBlur}
                                />
                                <UploadCloud className="h-8 w-8 text-slate-400 mb-2"/>
                                <span className="text-sm text-center text-slate-500">
                                    {file ? "Archivo seleccionado:" : "Haz clic o arrastra un archivo aquí"}
                                </span>
                                {file && <span className="font-medium text-sm text-slate-700 mt-1">{file.name}</span>}
                            </label>
                            {file && (
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

export const FormImageUpload = ({ name, label, description, aspectRatio = 'square' }: FormImageUploadProps) => {
    const { control, watch, setValue, formState: { errors } } = useFormContext();
    const files: FileList | null = watch(name);
    const file = files?.[0];
    const [preview, setPreview] = useState<string | null>(null);
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setPreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        } else {
            setPreview(null);
        }
    }, [file]);

    const handleRemove = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setValue(name, null, { shouldValidate: true });
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
    const hasError = !!errors[name];

    return (
        <FormField
            name={name}
            control={control}
            render={({ field: { ref, onBlur, ...fieldProps } }) => (
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
                                ref={inputRef}
                                onBlur={onBlur}
                                onChange={(e) => {
                                    setValue(name, e.target.files, { shouldValidate: true });
                                }}
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

interface FormMultiImageUploadProps {
  name: string;
  label: string;
  description?: string;
  count: number;
}

export const FormMultiImageUpload = ({ name, label, description, count }: FormMultiImageUploadProps) => {
    const { control, watch, setValue, formState: { errors } } = useFormContext();
    const files: FileList | null = watch(name);
    const [previews, setPreviews] = useState<(string | null)[]>(Array(count).fill(null));
    const [isDragging, setIsDragging] = useState(false);

    const inputRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
        const newPreviews = Array(count).fill(null);
        if (files && files.length > 0) {
            const fileArray = Array.from(files).slice(0, count);
            const promises = fileArray.map((file, index) => {
                return new Promise<void>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        newPreviews[index] = reader.result as string;
                        resolve();
                    };
                    reader.readAsDataURL(file as Blob);
                });
            });
            Promise.all(promises).then(() => setPreviews(newPreviews));
        } else {
            setPreviews(newPreviews);
        }
    }, [files, count]);

    const handleFiles = (newFiles: FileList | null) => {
        if (!newFiles) return;
        
        const dataTransfer = new DataTransfer();
        Array.from(newFiles).slice(0, count).forEach(file => dataTransfer.items.add(file));
        
        setValue(name, dataTransfer.files.length > 0 ? dataTransfer.files : null, { shouldValidate: true });
        
        if (inputRef.current) {
            inputRef.current.files = dataTransfer.files;
        }
    };

    const handleRemove = (e: React.MouseEvent, indexToRemove: number) => {
        e.preventDefault();
        e.stopPropagation();
        const currentFiles = Array.from(files || []);
        currentFiles.splice(indexToRemove, 1);
        
        const dataTransfer = new DataTransfer();
        currentFiles.forEach(file => dataTransfer.items.add(file as File));
        
        setValue(name, dataTransfer.files.length > 0 ? dataTransfer.files : null, { shouldValidate: true });
        
        if(inputRef.current) {
            inputRef.current.files = dataTransfer.files;
        }
    }
    
    const handleDragEvents = (e: React.DragEvent<HTMLLabelElement>, isEntering: boolean) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(isEntering);
    };

    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        handleDragEvents(e, false);
        handleFiles(e.dataTransfer.files);
    };
    
    const hasError = !!errors[name];

    return (
        <FormField
            name={name}
            control={control}
            render={({ field: { ref, onBlur, ...fieldProps } }) => (
                <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                        <div className="grid grid-cols-2 gap-4">
                            <label 
                                htmlFor={name}
                                className={cn(
                                    "col-span-2 border-2 border-dashed rounded-lg p-6 flex flex-col justify-center items-center cursor-pointer transition-colors",
                                    isDragging ? "border-primary bg-primary/10" : "hover:border-primary hover:bg-slate-50",
                                    hasError ? "border-destructive" : "border-slate-300"
                                )}
                                onDragEnter={(e) => handleDragEvents(e, true)}
                                onDragOver={(e) => handleDragEvents(e, true)}
                                onDragLeave={(e) => handleDragEvents(e, false)}
                                onDrop={handleDrop}
                            >
                                <UploadCloud className="h-8 w-8 text-slate-400 mb-2"/>
                                <span className="text-sm text-center text-slate-500">Selecciona o arrastra {count} fotos</span>
                                <Input
                                    type="file"
                                    className="hidden"
                                    id={name}
                                    accept="image/jpeg,image/png"
                                    multiple
                                    ref={inputRef}
                                    onBlur={onBlur}
                                    onChange={(e) => handleFiles(e.target.files)}
                                />
                            </label>

                            {previews.map((preview, index) => (
                                <div key={index} className="relative group block w-full cursor-pointer rounded-lg border-2 border-dashed flex items-center justify-center bg-slate-50 overflow-hidden aspect-video border-slate-300">
                                    {preview ? (
                                        <>
                                            <Image src={preview} alt={`Vista previa ${index + 1}`} layout="fill" objectFit="cover" />
                                            <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={(e) => handleRemove(e, index)}>
                                                <X className="h-4 w-4"/>
                                            </Button>
                                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                                        </>
                                    ) : (
                                        <div className="text-center p-2">
                                            <span className="text-xs text-slate-500">Foto {index + 1}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </FormControl>
                    {description && <FormDescription>{description}</FormDescription>}
                    <FormMessage />
                </FormItem>
            )}
        />
    );
};
    


    
    