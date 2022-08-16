/* global testRecords,cugirRecords */
'use strict'

const inputs = []

// collections will contain automatically-generated parent records that
// will be referenced by isPartOf
const collections = {}

document.addEventListener('DOMContentLoaded', init)

function init () {
  document.getElementById('inputFiles').addEventListener('change', inputFilesChanged)
  document.getElementById('input').addEventListener('dragenter', dragEnter)
  document.getElementById('input').addEventListener('dragleave', dragLeave)
  document.getElementById('input').addEventListener('drop', dropFiles)
  document.getElementById('input').addEventListener('change', processInput)
  document.getElementById('download').addEventListener('click', downloadFile)
  document.getElementById('test').addEventListener('click', loadTestRecords)
  document.getElementById('cugir').addEventListener('click', loadCugirRecords)
}

function loadTestRecords () {
  let input = JSON.stringify(testRecords, null, 2)

  // add blank lines between records, for readability
  input = input.replace(/},\n\s\s{/g, '},\n\n\n\n  {')

  document.getElementById('input').value = input
  processInput()
}

function loadCugirRecords () {
  let input = JSON.stringify(cugirRecords, null, 2)

  // add blank lines between records, for readability
  input = input.replace(/},\n\s\s{/g, '},\n\n\n\n  {')

  document.getElementById('input').value = input
  processInput()
}

function dragEnter (e) {
  e.preventDefault()
  e.target.classList.add('dragging')
}

function dragLeave (e) {
  e.preventDefault()
  e.target.classList.remove('dragging')
}

function dropFiles (e) {
  e.preventDefault()
  e.target.classList.remove('dragging')
  const files = e.dataTransfer.files
  processFiles(files)
}

function inputFilesChanged (e) {
  const files = this.files
  processFiles(files)
}

function processFiles (files) {
  // Push the contents of each file to global inputs []
  document.getElementById('output').placeholder = 'processing...'
  const r = new window.FileReader()
  function readFile (i) {
    if (i >= files.length) {
      gotInputs()
      return
    }
    const file = files[i]
    r.onload = function (e) {
      let j
      try {
        // parse as json
        j = JSON.parse(e.target.result)
      } catch {
        window.alert('Error parsing JSON from file: ' + file.name)
        return
      }
      // if a full solr response, only use the response/docs
      if (j.response && j.response.docs) {
        j = j.response.docs
      }

      // pretty-print
      const pp = JSON.stringify(j, null, 2)
      inputs.push(pp)
      readFile(i + 1)
    }
    r.readAsText(file)
  }
  readFile(0)
}

function gotInputs () {
  // merge the inputs into an array
  let input = inputs
  if (input.length > 1) {
    input = '[\n' + input.join(',\n') + '\n]'
  }
  document.getElementById('input').value = input
  processInput()
}

function downloadFile () {
  // download the output as a .json file
  const output = document.getElementById('output').value
  const blob = new window.Blob([output], {
    type: 'application/json'
  })
  const url = window.URL.createObjectURL(blob)

  // download via a temporary <a> element
  const a = document.createElement('a')
  a.href = url
  a.download = 'aardvark.json'
  a.click()
}

function resetInput (e) {
  console.log('reset')
  document.location.reload()
}

function processInput () {
  // convert the input string to data
  const input = document.getElementById('input').value
  let j
  try {
    j = JSON.parse(input)
  } catch {
    // maybe the user is typing, and it's not valid JSON yet
    return
  }

  const count = (j.length > 1) ? j.length : 1

  // display number of records
  document.getElementById('count').innerHTML = count + ' record' + (count === 1 ? '' : 's') + " <button id='reset'>x</button>"
  document.getElementById('reset').addEventListener('click', resetInput)

  // convert each record from gbl 1.0 to aardvark
  if (count > 1) {
    for (let i = 0; i < j.length; i++) {
      j[i] = gbl2aardvark(j[i])
    }
  } else {
    j = gbl2aardvark(j)
  }

  // add any new collection records
  for (let c in collections) {
    let cr = collections[c]

    // remove temp field
    delete cr.bbox
    
    j.push(cr)
  }

  // convert data back to a string
  let output = JSON.stringify(j, null, 2)

  // add blank lines between records, for readability
  output = output.replace(/},\n\s\s{/g, '},\n\n\n\n  {')

  document.getElementById('output').value = output

  // enable the download button
  document.getElementById('download').removeAttribute('disabled')
}

function gbl2aardvark (r1) {
  // convert gbl record r1 to aardvark

  // make sure r1 is valid
  r1 = checkValues(r1)

  // r2 will contain the new record
  let r2 = {}

  // track which fields we have seen
  const seen = []

  // process all the possible destination fields (in this order, for a more logical record layout)
  renameField('layer_slug_s', 'id')
  renameField('dc_identifier_s', 'dct_identifier_sm')
  renameField('dc_title_s', 'dct_title_s')
  copyField('dct_alternative_sm')
  renameField('dc_description_s', 'dct_description_sm')
  renameField('dc_language_s', 'dct_language_sm')
  renameField('dc_language_sm', 'dct_language_sm')
  renameField('dc_creator_sm', 'dct_creator_sm')
  renameField('dc_publisher_s', 'dct_publisher_sm')
  renameField('dct_provenance_s', 'schema_provider_s')
  setResourceClass()
  setResourceType()
  renameField('dc_subject_sm', 'dct_subject_sm')
  setTheme()
  copyField('dcat_keyword_sm')
  renameField('dct_temporal_sm', 'dct_temporal_sm')
  renameField('dct_issued_s', 'dct_issued_s')
  renameField('solr_year_i', 'gbl_indexYear_im')
  setDateRange()
  renameField('dct_spatial_sm', 'dct_spatial_sm')
  renameField('solr_geom', 'locn_geometry')
  renameField('solr_geom', 'dcat_bbox')
  copyField('dcat_centroid')
  copyField('dct_relation_sm')
  copyField('pcdm_memberOf_sm')
  renameField('dc_source_sm', 'dct_source_sm')
  copyField('dct_isVersionOf_sm')
  copyField('dct_replaces_sm')
  copyField('dct_isReplacedBy_sm')
  copyField('dct_rights_sm')
  copyField('dct_rightsHolder_sm')
  copyField('dct_license_sm')
  setAccessRights()
  renameField('dc_format_s', 'dct_format_s')
  renameField('cugir_filesize_s', 'gbl_fileSize_s')
  renameField('layer_id_s', 'gbl_wxsIdentifier_s')
  setReferences()
  renameField('layer_modified_dt', 'gbl_mdModified_dt')
  setVersion()
  renameField('suppressed_b', 'gbl_suppressed_b')
  copyField('gbl_georeferenced_b')
  setIsPartOf()
  copyExtraFields()
  r2 = checkValues(r2)
  return r2

  function see(g) {
    // note that we have seen field g
    if (seen.indexOf(g) === -1) {
      seen.push(g)
    }
  }

  function copyField (f) {
    // copy gbl field f from r1 to r2
    if (r1[f] !== undefined) {
      see(f)
      r2[f] = r1[f]
    }
  }

  function renameField(g, a) {
    // rename gbl field g of r1 to aardvark field a of r2
    if (a === undefined) {
      console.log('rename requires 2 params', g)
    }

    if (r1[g] !== undefined) {
      see(g)
      r2[a] = r1[g]
    }
    // also copy any existing field having the new name
    if (r1[a] !== undefined) {
      if (a !== g && r2[a]) {
        console.log('overwriting value of ' + a, r2)
      }
      r2[a] = r1[a]
    }
  }

  function setAccessRights () {
    // default to public, unless otherwise specified
    r2.dct_accessRights_s = r1.dc_rights_s || 'Public'
  }

  function setDateRange () {
    copyField('gbl_dateRange_drsim')
    if (!r2.gbl_dateRange_drsim) {
      // try to create from dct_temporal_sm
      if (/\d{4} to \d{4}/.test(r2.dct_temporal_sm)) {
        r2.gbl_dateRange_drsim = '[' + r2.dct_temporal_sm + ']'
      }
    }
  }

  function setIsPartOf () {
    let c = r1.dct_isPartOf_sm
    if (c === undefined) {
      return
    }
    if (collections[c] === undefined) {
      // create new collection record
      let cr = {}
      // starting with copy of r2
      Object.assign(cr, r2)
      // and modifing/removing some fields
      cr.id = collectionId(c)
      delete cr.dct_identifier_sm
      cr.dct_title_s = c
      cr.dct_description_sm = ['EDIT ME to describe the whole collection -- ' + cr.dct_description_sm]
      cr.gbl_resourceClass_sm = 'Collections'
      delete cr.gbl_fileSize_s
      delete cr.dct_source_sm

      let bbox = parseBbox(cr.dcat_bbox)
      if (bbox !== undefined) {
        cr.bbox = bbox
      }

      cr.count = 1
      collections[c] = cr
    } else {
      // collection record exists, so modify with info from r1
      let cr = collections[c]

      // expand bbox to includ new item
      let bbox = parseBbox(r2.dcat_bbox)
      if (bbox[0] > cr.bbox[0]) {
        cr.bbox[0] = bbox[0]
      }
      if (bbox[1] < cr.bbox[1]) {
        cr.bbox[1] = bbox[1]
      }
      if (bbox[2] > cr.bbox[2]) {
        cr.bbox[2] = bbox[2]
      }
      if (bbox[3] < cr.bbox[3]) {
        cr.bbox[3] = bbox[3]
      }
      cr.dcat_bbox = `ENVELOPE(${cr.bbox.join(', ')})`

      cr = addNewValues(cr, 'dct_language_sm')
      cr = addNewValues(cr, 'dct_creator_sm')
      cr = addNewValues(cr, 'dct_publisher_sm')
      cr = addNewValues(cr, 'gbl_resourceType_sm')
      cr = addNewValues(cr, 'dct_subject_sm')
      cr = addNewValues(cr, 'dcat_theme_sm')
      cr = addNewValues(cr, 'dcat_keyword_sm')
      cr = addNewValues(cr, 'dct_temporal_sm')
      cr = addNewValues(cr, 'gbl_indexYear_im')
      cr = addNewValues(cr, 'dct_spatial_sm')
      cr.count++
    }
  }

  function addNewValues(cr, f) {
    // add any new values of field f to collection record cr
    const v = r2[f]
    if (v !== undefined) {
      for (let i = 0; i < v.length; i++) {
        if (cr[f].indexOf(v[i]) === -1) {
          cr[f].push(v[i])
          cr[f] = cr[f].sort()
        }
      }
    }
    return cr
  }

  function collectionId (c) {
    // TODO allow user-defined prefix, or a naming scheme based on the collection name c 
    return "generated-collection-" + Math.floor(Math.random()*1000000000000).toString(36)
  }

  function parseBbox (s) {
    let m = s.match(/ENVELOPE\(\s*([\d.-]+),\s*([\d.-]+),\s*([\d.-]+),\s*([\d.-]+)/)
    return m.slice(1)
  }
  
  function setReferences () {
    let ref = r1.dct_references_s
    if (ref === undefined) {
      return
    }
    try {
      ref = JSON.parse(ref)
    } catch {
      console.log('error parsing dct_references_s: ' + ref)
      r2.dct_references_s = ref
      return
    }
    let downloads = []
    let dl = ref['http://schema.org/downloadUrl']
    if (dl) {
      if (typeof(dl) === 'string') {    
        // copy existing string containing single url
        downloads.push({'label': r2.dct_format_s, 'url': dl})
      } else if (typeof(dl) === 'object') {
        // copy existing new-style downloads
        downloads = dl
      }
    }
    // add additional downloads from these custom fields
    for (let f of ['cugir_addl_downloads_s', 'nyu_addl_downloads_s']) {
      let addlstr = r1[f]
      if (addlstr) {
        try {
          let addlobj = JSON.parse(addlstr)
          for (let k of Object.keys(addlobj)) {
            downloads.push({'label': k, 'url': addlobj[k]})
          }
          delete r1[f]
        }
        catch {
          console.log('error parsing ' + f + ': ' + addlstr)
        }
      }
    }
    ref['http://schema.org/downloadUrl'] = downloads
    r2.dct_references_s = JSON.stringify(ref)
    delete r1.dct_references_s
  }

  function setResourceClass () {
    // GBL1 has dc_type_s: Dataset | Image | Collection | Interactive Resource | Collection | Physical Object
    // Aardvark has gbl_resourceClass_sm: Collections | Datasets | Imagery | Maps | Web services | Websites | Other
    // TODO: should these new values be singular instead?  Also, image vs imagery
    const crosswalk = {
      'dataset': 'Datasets',
      'image': 'Imagery',
      'collection': 'Collections',
      'interactive resource': 'Websites',
      'physical object': 'Other'
    }
    const v1 = r1.dc_type_s
    let v2
    try {
      // use lowercase for case-insensitive matching
      v2 = crosswalk[v1.toLowerCase()]
    } catch { }
    if (v2 === undefined) {
      // because this is a required field
      v2 = 'EDIT ME -- this record had dc_type_s = ' + v1
    }
    r2.gbl_resourceClass_sm = [v2]
    delete r1.dc_type_s
  }

  function setResourceType () {
    // GBL1 has layer_geom_type_s: Point | Line | Polygon | Image | Raster | Mixed | Table
    // Aardvark has gbl_resourceType_sm: 81 possible values, https://opengeometadata.org/docs/ogm-aardvark/resource-type
    const crosswalk = {
      'point': 'Point data',
      'line': 'Line data',
      'polygon': 'Polygon data',
      // 'image': '',
      'raster': 'Raster data',
      // 'mixed': '',
      'table': 'Table data'
    }
    const v1 = r1.layer_geom_type_s
    let v2
    try {
      // use lowercase for case-insensitive matching
      v2 = crosswalk[v1.toLowerCase()]
    } catch { }
    if (v2 === undefined && v1 !== undefined) {
      v2 = 'EDIT ME -- this record had layer_geom_type_s = ' + v1
    }
    if (v2 !== undefined) {
      r2.gbl_resourceType_sm = [v2]
    }
    delete r1.layer_geom_type_s
  }

  function setTheme () {
    // Set themes of r2, based on dc_subject_sm of r1
    // The following object defines various words that will be mapped to each theme.
    // A keyword must match word boundaries unless it ends with .*
    // For example "bus" will not match "business".
    const keywords = {
      'agriculture': 'agricultur.*,farm.*,cultiva.*,irrigation,aquaculture,plantation.*,herding,crop.*,livestock',

      'biology': 'biolog.*,biota,flora,fauna,wildlife,vegetation,ecolog.*,wilderness,sealife,habitat,bird.*,mammal.*,fish.*,tree.*,flower.*',

      'boundaries': 'boundar.*,political,administrative',

      'climate': 'climat.*,climatologymeteorologyatmosphere,atmospher.*,cloud cover,weather,precipitation,snow,ice,glacier.*,tornado.*',

      'economy': 'econom.*,employ.*,business.*,labou?r,sales?,revenue,commerc.*,industr.*,tourism,forestry,fisher.*',

      'elevation': 'elevation,altitude,dem,bathymetr.*,lidar,slope,topograph.*',

      'environment': 'environment.*,conservation,pollut.*,waste,natur.*,landscape',

      'events': 'events?,disasters?,concerts?,races?,protests?,crime,arrests?,accidents?,cases?',

      'geology': 'geolog.*,geoscientificInformation,earth science,geophysic.*,minerals?,rocks?,earthquakes?,volcane*,landslides?,gravit.*,soils?,permafrost,erosion',

      'health': 'health,human ecology,safety,diseases?,illness.*,hygiene,substance abuse,hospitals?,doctors?',

      'imagery': 'image.*,aerial,photo.*,oblique,.*views?',

      'inland waters': 'waters?,inlandWaters,drainages?,rivers?,streams?,glaciers?,lakes?,dams?,floods?,hydrograph.*',

      'land cover': 'land cover,landcover,forests?,wetlands?,impervious.*,canop.*',

      'location': 'location.*,position.*,address.*,geodetic,control points?,postal,place names?,placenames?,gazetteers?,zip\\s?codes?',

      'military': 'militar.*,intelligenceMilitary,barracks',

      'oceans': 'ocean.*,tides?,tidal,waves?,coast.*,reefs?',

      'property': 'propert.*,planningCadastre,land use,zoning,cadastr.*,land ownership',

      'society': 'society,cultures?,settlements?,anthropology,archaeology,education.*,tradition.*,manners,customs,demograph.*,recreation.*,social,crimes?,justice,census.*,sociolog.*,parks,elections?,voting,legislat.*',

      'structure': 'structur.*,man-made,construction.*,buildings?,museums?,church.*,factor(y|ies),hous(e|ing),monuments?,shop.*,towers?,parking',

      'transportation': 'transport.*,roads?,streets?,airports?,airstrips?,shipping,tunnels?,nautical,vehic.*,vessels?,aeronaut.*,rail.*,transit,bus,buses,subways?',

      'utilities': 'utilit.*,utilitiesCommunication,energy,communicat.*,sewers?,broadband,phones?,telephon.*,internet'
    }

    let themes = r1.dcat_theme_sm
    if (themes === undefined) {
      themes = []
    }

    const subjects = r1.dct_subject_sm
    if (subjects && subjects.length > 0) {
      for (let si = 0; si < subjects.length; si++) {
        const subject = subjects[si].toLowerCase()
        for (const [k, v] of Object.entries(keywords)) {
          const re = new RegExp('\\b(' + v.replace(/,/g, '|') + ')\\b')
          if (re.test(subject) && themes.indexOf(k) === -1) {
            themes.push(k)
          }
        }
      }
    }
    // add any cugir categories that we don't already have in themes
    if (r1.cugir_category_sm) {
      for (let i = 0; i < r1.cugir_category_sm.length; i++) {
        let t = r1.cugir_category_sm[i]
        if (t === 'landcover') {
          t = 'land cover'
        }
        if (themes.indexOf(t) === -1) {
          themes.push(t)
        }
      }
      delete r1.cugir_category_sm
    }
    if (themes.length > 0) {
      r2.dcat_theme_sm = themes
    }
  }

  function setVersion () {
    r2.gbl_mdVersion_s = 'Aardvark'
    delete r1.geoblacklight_version
  }

  function copyExtraFields () {
    for (const p in r1) {
      // copy any fields we haven't already seen and dealt with
      if (seen.indexOf(p) === -1) {
        r2[p] = r1[p]
      }
    }
  }

  function checkValues (r) {
    for (const p in r) {
      const v = r[p]

      // check for _sm suffix, and make sure those are arrays
      const suffix = p.split('_').slice(-1)[0]
      if (suffix === 'sm' && !Array.isArray(v)) {
        r[p] = [v]
      }

      // omit empty arrays and strings
      if (r[p].length === 0) {
        delete r[p]
      }
    }
    return r
  }
}
