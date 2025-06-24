import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
} from "@nasa-jpl/stellar-react";
import classNames from "classnames";
import { InputHTMLAttributes } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

export type InputFormProps = {
  defaultValue: string;
  formSchema: z.ZodTypeAny;
  inlineLabelWidth?: number;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
  label: string;
  layout?: "inline" | "stacked";
  name: string;
  onChange: (value: string) => void;
};

export function InputForm({
  defaultValue = "",
  formSchema,
  label,
  inlineLabelWidth = 100,
  name,
  inputProps = {},
  layout = "stacked",
  onChange,
}: InputFormProps) {
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      [name]: defaultValue,
    },
    mode: "onChange",
  });

  function onFormChange(data: z.infer<typeof formSchema>) {
    onChange(data[name]);
  }

  return (
    <Form {...form}>
      <form
        className="w-full"
        onChange={form.handleSubmit(onFormChange)}
        onSubmit={(evt) => evt.preventDefault()}
      >
        <FormField
          control={form.control}
          name={name}
          render={({ field }) => (
            <FormItem
              size="sm"
              className={classNames({
                "flex gap-4 items-center": layout === "inline",
              })}
            >
              <FormLabel
                className="whitespace-nowrap flex-shrink-0"
                size="sm"
                style={layout === "inline" ? { width: inlineLabelWidth } : {}}
              >
                {label}
              </FormLabel>
              <FormControl>
                <Input
                  sizeVariant="xs"
                  autoComplete="off"
                  {...field}
                  {...inputProps}
                  className={classNames({ "!m-0": layout === "inline" })}
                />
              </FormControl>
              <FormMessage size="sm" />
            </FormItem>
          )}
        />
      </form>
    </Form>
  );
}
