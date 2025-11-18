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
          <Input {...props} {...field} value={field.value ?? ''} />
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
  options: { value: string; label: string }[];
  description?: string;
  disabled?: boolean;
}

export const FormSelect = ({ name, label, placeholder, options, description, disabled }: FormSelectProps) => (
  <FormField
    name={name}
    render={({ field }) => (
      <FormItem>
        <FormLabel>{label}</FormLabel>
        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={disabled}>
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            {options.map((opt) => (
              <SelectItem
                key={opt.value}
                value={opt.value}
              >
                {opt.label}
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
    const watchedValue = watch(name);
    const [preview, setPreview] = useState<string | null>(null);
    const inputRef = React.useRef<HTMLInputElement | null>(null);

    React.useEffect(() => {
        if (typeof watchedValue === 'string') {
            setPreview(watchedValue);
        } else if (watchedValue instanceof FileList && watchedValue.length > 0) {
            const file = watchedValue[0];
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
      setValue(name, e.target.files, { shouldValidate: true });
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
