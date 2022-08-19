# gbl2aardvark

This repo contains a simple javascript application that lets you easily convert [GeoBlacklight 1.0](https://opengeometadata.org/docs/gbl-1.0) records to the new [OpenGeoMetadata Aardvark schema](https://opengeometadata.org/docs/ogm-aardvark).

You can select a local file or files, or simply paste your json records (single records or an array of records).

If your records used the old `dct_isPartOf_sm` field, containing a text string of a collection name, this tool automatically creates the new "Collection" records that are required by Aardvark, and links to them from the child records.  The new collection records will appear at the end of the output json.  Here's a chart of how each field is handled when generating the collection records:

| FIELD	| COLLECTION RECORD HANDLING |
| ----- | ---------------------------------------- |
| id | generate new id (like "cugir-collection-17sg4wlp") |
| dct_identifier_sm | omit -- only relevant to child record |
| dct_title_s | copy from GBL1.0 child record dct_isPartOf_sm |
| dct_alternative_sm | omit -- only relevant to child record |
| dct_description_sm | copy from first child record, but EDIT to reflect the collection |
| dct_language_sm | aggregate unique values from child records |
| dct_creator_sm | aggregate unique values from child records |
| dct_publisher_sm | aggregate unique values from child records |
| schema_provider_s | aggregate unique values from child records |
| gbl_resourceClass_sm | always set to "Collections" |
| gbl_resourceType_sm | aggregate unique values from child records |
| dct_subject_sm | aggregate unique values from child records |
| dcat_theme_sm | aggregate unique values from child records |
| dcat_keyword_sm | aggregate unique values from child records |
| dct_temporal_sm | aggregate unique values from child records |
| dct_issued_s | omit -- not useful at collection level? |
| gbl_indexYear_im | aggregate unique values from child records |
| gbl_dateRange_drsim | omit -- new field in Aardvark, probably not present in GBL1.0 records |
| dct_spatial_sm | aggregate unique values from child records |
| locn_geometry | aggregate ENVELOPE() from child records |
| dcat_bbox | aggregate ENVELOPE() from child records |
| dcat_centroid | omit -- new field in Aardvark, probably not present in GBL1.0 records |
| dct_relation_sm | omit -- new field in Aardvark, probably not present in GBL1.0 records |
| pcdm_memberOf_sm | omit -- new field in Aardvark, probably not present in GBL1.0 records |
| dct_isPartOf_sm | omit -- child records have the name used for this collection |
| dct_source_sm | omit |
| dct_isVersionOf_sm | omit -- new field in Aardvark, probably not present in GBL1.0 records |
| dct_replaces_sm | omit -- new field in Aardvark, probably not present in GBL1.0 records |
| dct_isReplacedBy_sm | omit -- new field in Aardvark, probably not present in GBL1.0 records |
| dct_rights_sm | omit -- new field in Aardvark, probably not present in GBL1.0 records |
| dct_rightsHolder_sm | omit -- new field in Aardvark, probably not present in GBL1.0 records |
| dct_license_sm | omit -- new field in Aardvark, probably not present in GBL1.0 records |
| dct_accessRights_s | copy from child record (but only if all child records have the same value) |
| dct_format_s | copy from child record (but only if all child records have the same value) |
| gbl_fileSize_s | omit -- only relevant to child record |
| gbl_wxsIdentifier_s | omit -- only relevant to child record |
| dct_references_s | omit -- only relevant to child record |
| gbl_mdModified_dt | generate new timestamp |
| gbl_mdVersion_s | always set to "Aardvark" |
| gbl_suppressed_b | set to true only if all child records are true, otherwise omit |
| gbl_georeferenced_b | omit -- new field in Aardvark, probably not present in GBL1.0 records |