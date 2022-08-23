# Notes, questions, and observations

## gbl_resourceClass_sm (Required)
- why are these plural?

## dcat_theme_sm (Optional)
- should these be capitalized, or lowercase?

## dcat_centroid
- why is this a string `"46.4218,-94.087"` instead of an array of numbers? `[46.4218,-94.087]`

## gbl_wxsIdentifier_s (Conditional)
- why isn't this stored within dct_references? (where WMS/WFS are)
- why does [doc](https://opengeometadata.org/docs/ogm-aardvark/wxs-identifier) say "Multiplicity = 0-1 or 1-1"?

## id (Required)
- move this to the top?
- "globally unique value" -- clarify that it must be "locally unique", but suggest using institution prefix to help ensure "globally unique" across GBL site to facilitate record sharing

## dct_identifier_sm (Recommended)
- move this to the top, too?

## gbl_dateRange_drsim
- should this have multiplicity 0-1 (instead of 0-\*)?

## dct_description_sm
- why would this field have multiplicity 0-\* ?  Is there a use case for multiple descriptions?

## dct_rights_sm
- example has a markdown-formatted link -- does GBL handle that out of the box?

## gbl_indexYear_im
- obligation=recommended, but multiplicity=1-*

## gbl_mdModified_dt
- "XML Schema dataTime format" -- can we say ["W3C Date and Time Format"](https://www.w3.org/TR/NOTE-datetime) and also allow dates without times?

## dct_spatial_sm
- "Our recommended thesaurus is GeoNames", but GeoNames doesn't have an official full-string that corresponds to the example (it would need to be constructed by concatenating the placename with the parent admin units)

## gbl_georeferenced_b
- string or boolean? or just boolean?

## gbl_suppressed_b
- string or boolean? or just boolean?

## dct_temporal_sm
- questions about the commentary...
