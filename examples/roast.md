 
> [! INFO]  🫘 <% tp.file.title %>
>  Beans:
> Batch Size: 80gr
> Profile: kl_log_var_profile_short_name
>  Log: kl_log_attachment
>  Tags:  #roast#coffee


kl_log_chart

# 💡 Notes

# ☕ Cupping

```dataview
TABLE WITHOUT ID file.link, Total AS "Projects"
FROM "📖 Resources/coffee/cupping"
WHERE contains(roast, this.file.link)
SORT file.name
```


# 📝 Profile

kl_log_table_profile



# 🫘 Roast

kl_log_table_roast


# 🤓 Stats

kl_log_data_table


# 🪵 PDF

kl_log_attachment_pdf
