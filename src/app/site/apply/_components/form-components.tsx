
"use client";

import { useFormContext, Controller } from "react-hook-form";
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
import React, { useState, useEffect, useRef } from "react";
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
        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value} disabled={disabled}>
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
  const { control, formState: { errors } } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const [fileName, setFileName] = useState<string | null>(null);
        const [isDragging, setIsDragging] = useState(false);
        const inputRef = useRef<HTMLInputElement | null>(null);

        useEffect(() => {
          if (field.value instanceof FileList && field.value.length > 0) {
            setFileName(field.value[0].name);
          } else if (typeof field.value === 'string') {
            setFileName(field.value.split('/').pop() || null);
          } else {
            setFileName(null);
          }
        }, [field.value]);

        const handleRemove = (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          field.onChange(null);
          if (inputRef.current) {
            inputRef.current.value = "";
          }
        };

        const handleDragEvents = (e: React.DragEvent<HTMLLabelElement>, isEntering: boolean) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(isEntering);
        };

        const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
          handleDragEvents(e, false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            field.onChange(e.dataTransfer.files);
          }
        };

        const hasError = !!errors[name];

        return (
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
                    onChange={(e) => field.onChange(e.target.files)}
                  />
                  <UploadCloud className="h-8 w-8 text-slate-400 mb-2" />
                  <span className="text-sm text-center text-slate-500">
                    {fileName ? "Archivo seleccionado:" : "Haz clic o arrastra un archivo aquí"}
                  </span>
                  {fileName && <span className="font-medium text-sm text-slate-700 mt-1">{fileName}</span>}
                </label>
                {fileName && (
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-6 w-6" onClick={handleRemove}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
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
  const { control, formState: { errors } } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const [preview, setPreview] = useState<string | null>(null);
        const inputRef = useRef<HTMLInputElement | null>(null);

        useEffect(() => {
          if (field.value instanceof FileList && field.value.length > 0) {
            const file = field.value[0];
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(file);
          } else if (typeof field.value === 'string') {
            setPreview(field.value);
          } else {
            setPreview(null);
          }
        }, [field.value]);

        const handleRemove = (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          field.onChange(null);
          if (inputRef.current) {
            inputRef.current.value = "";
          }
        };

        const hasError = !!errors[name];

        return (
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
                  onChange={(e) => field.onChange(e.target.files)}
                />
                {preview ? (
                  <>
                    <Image src={preview} alt="Vista previa" layout="fill" objectFit="cover" />
                    <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity z-10" onClick={handleRemove}>
                      <X className="h-4 w-4" />
                    </Button>
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </>
                ) : (
                  <div className="text-center p-4">
                    <UploadCloud className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                    <span className="text-sm text-slate-500">Subir imagen</span>
                  </div>
                )}
              </label>
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage />
          </FormItem>
        );
      }}
    />
  );
};


interface SingleImageDropzoneProps {
    name: string;
    label: string;
}

const SingleImageDropzone = ({ name, label }: SingleImageDropzoneProps) => {
  const { control, formState: { errors } } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => {
        const [preview, setPreview] = useState<string | null>(null);
        const [isDragging, setIsDragging] = useState(false);
        const inputRef = useRef<HTMLInputElement | null>(null);

        useEffect(() => {
          if (field.value instanceof FileList && field.value.length > 0) {
            const file = field.value[0];
            const reader = new FileReader();
            reader.onloadend = () => setPreview(reader.result as string);
            reader.readAsDataURL(file);
          } else if (typeof field.value === 'string') {
            setPreview(field.value);
          } else {
            setPreview(null);
          }
        }, [field.value]);

        const handleRemove = (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          field.onChange(null);
          if (inputRef.current) {
            inputRef.current.value = "";
          }
        };

        const handleDragEvents = (e: React.DragEvent<HTMLLabelElement>, isEntering: boolean) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(isEntering);
        };

        const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
          handleDragEvents(e, false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            field.onChange(e.dataTransfer.files);
          }
        };

        const hasError = !!errors[name];

        return (
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
                  ref={inputRef}
                  onChange={(e) => field.onChange(e.target.files)}
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
        );
      }}
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
