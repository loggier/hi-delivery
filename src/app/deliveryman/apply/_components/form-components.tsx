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
import React, { useState } from "react";
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
                  "w-full pl-3 text-left font-normal",
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
              locale={es}
              mode="single"
              selected={field.value}
              onSelect={field.onChange}
              disabled={(date) =>
                date > new Date() || date < new Date("1930-01-01")
              }
              initialFocus
              captionLayout="dropdown-buttons"
              fromYear={1930}
              toYear={new Date().getFullYear()}
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
                  "w-full pl-3 text-left font-normal",
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
              locale={es}
              mode="single"
              selected={field.value}
              onSelect={field.onChange}
              disabled={(date) =>
                date < new Date(new Date().setHours(0,0,0,0))
              }
              initialFocus
              captionLayout="dropdown-buttons"
              fromYear={new Date().getFullYear()}
              toYear={new Date().getFullYear() + 10}
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
    const { register, watch, setValue, formState: { errors } } = useFormContext();
    const files = watch(name);
    const file = files?.[0];
    const [isDragging, setIsDragging] = useState(false);

    const inputRef = React.useRef<HTMLInputElement | null>(null);
    const { ref: registerRef, ...rest } = register(name);

    const handleRemove = () => {
      setValue(name, null, { shouldValidate: true });
    }

    const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const droppedFiles = e.dataTransfer.files;
        if (droppedFiles && droppedFiles.length > 0) {
            setValue(name, droppedFiles, { shouldValidate: true });
        }
    };
    
    const hasError = !!errors[name];

    return (
        <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
                <div className="relative">
                    <Input
                        type="file"
                        className="hidden"
                        id={name}
                        accept={accept}
                        {...rest}
                        ref={(e) => {
                            registerRef(e);
                            if (inputRef) {
                                (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = e;
                            }
                        }}
                    />
                    <label 
                        htmlFor={name}
                        className={cn(
                            "border-2 border-dashed rounded-lg p-6 flex flex-col justify-center items-center cursor-pointer transition-colors",
                            isDragging ? "border-primary bg-primary/10" : "hover:border-primary hover:bg-slate-50",
                            hasError ? "border-destructive" : "border-slate-300"
                        )}
                        onDragEnter={handleDragEnter}
                        onDragOver={handleDragEnter}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                    >
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
    );
};

interface FormImageUploadProps {
  name: string;
  label: string;
  description?: string;
  aspectRatio?: 'square' | 'video';
}

export const FormImageUpload = ({ name, label, description, aspectRatio = 'square' }: FormImageUploadProps) => {
    const { register, watch, setValue, formState: { errors } } = useFormContext();
    const files = watch(name);
    const file = files?.[0];
    const [preview, setPreview] = useState<string | null>(null);

    const { ref, ...rest } = register(name);

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
      setValue(name, null, { shouldValidate: true });
    }
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
                        {...rest}
                        ref={ref}
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
    );
}

interface FormMultiImageUploadProps {
  name: string;
  label: string;
  description?: string;
  count: number;
}

export const FormMultiImageUpload = ({ name, label, description, count }: FormMultiImageUploadProps) => {
    const { register, watch, setValue } = useFormContext();
    const files = watch(name);
    const [previews, setPreviews] = useState<(string | null)[]>(Array(count).fill(null));

    const { ref, ...rest } = register(name);

    React.useEffect(() => {
        if (files && files.length > 0) {
            const newPreviews = Array(count).fill(null);
            const promises = Array.from(files).slice(0, count).map((file, index) => {
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
            setPreviews(Array(count).fill(null));
        }
    }, [files, count]);

    const handleRemove = (e: React.MouseEvent, index: number) => {
        e.preventDefault();
        const currentFiles = Array.from(files || []);
        currentFiles.splice(index, 1);
        const dataTransfer = new DataTransfer();
        currentFiles.forEach(file => dataTransfer.items.add(file as File));
        setValue(name, dataTransfer.files, { shouldValidate: true });
    }

    return (
        <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormControl>
                <div className="grid grid-cols-2 gap-4">
                     <label 
                        htmlFor={name}
                        className="col-span-2 border-2 border-dashed border-slate-300 rounded-lg p-6 flex flex-col justify-center items-center cursor-pointer hover:border-primary hover:bg-slate-50 transition-colors"
                    >
                        <UploadCloud className="h-8 w-8 text-slate-400 mb-2"/>
                        <span className="text-sm text-center text-slate-500">Selecciona 4 fotos</span>
                         <Input
                            type="file"
                            className="hidden"
                            id={name}
                            accept="image/jpeg,image/png"
                            multiple
                            {...rest}
                            ref={ref}
                            onChange={(e) => {
                                const files = e.target.files;
                                if (files) {
                                    const dataTransfer = new DataTransfer();
                                    Array.from(files).slice(0, count).forEach(file => dataTransfer.items.add(file));
                                    setValue(name, dataTransfer.files, { shouldValidate: true });
                                }
                                rest.onChange(e);
                            }}
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
    );
};
