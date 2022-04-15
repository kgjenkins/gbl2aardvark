/* global testRecords,cugirRecords */
'use strict'

const inputs = []

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

  // enable the download button
  document.getElementById('download').disabled = false
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

  // convert data back to a string
  let output = JSON.stringify(j, null, 2)

  // add blank lines between records, for readability
  output = output.replace(/},\n\s\s{/g, '},\n\n\n\n  {')

  document.getElementById('output').value = output
}

function gbl2aardvark (r1) {
  // convert record r to aardvark

  function renameField (g, a) {
    // copy gbl field g of r to aardvark property a of r2
    if (r1[g] !== undefined) {
      r2[a] = r1[g]
      delete r1[g]
    }
    // also copy any existing a field
    if (r1[a] !== undefined) {
      r2[a] = r1[a]
      delete r1[a]
    }
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
    r2.gbl_resourceClass_sm = v2
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
      r2.gbl_resourceType_sm = v2
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
    // get subjects from r2, since they have already been removed from r1
    const subjects = r2.dct_subject_sm
    const themes = []
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

  function setDateRange () {
    renameField('', 'gbl_dateRange_drsim')
    if (!r2.gbl_dateRange_drsim) {
      // try to create from dct_temporal_sm
      if (/\d{4} to \d{4}/.test(r2.dct_temporal_sm)) {
        r2.gbl_dateRange_drsim = '[' + r2.dct_temporal_sm + ']'
      }
    }
  }

  function setVersion () {
    r2.gbl_mdVersion_s = 'OGM Aardvark'
    delete r1.geoblacklight_version
  }

  function copyExtraFields () {
    for (const p in r1) {
      r2[p] = r1[p]
      delete r1[p]
    }
  }

  function checkMultiValues () {
    for (const p in r2) {
      const v = r2[p]

      // check for _sm suffix, and make sure those are arrays
      const suffix = p.split('_').slice(-1)[0]
      if (suffix === 'sm' && !Array.isArray(v)) {
        r2[p] = [v]
      }

      // omit empty arrays
      if (r2[p].length === 0) {
        delete r2[p]
      }
    }
  }

  const r2 = {}
  // iterate through all the possible destination fields

  renameField('dc_title_s', 'dct_title_s')
  renameField('', 'dct_alternative_sm')
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
  renameField('', 'dcat_keyword_sm')
  renameField('dct_temporal_sm', 'dct_temporal_sm')
  renameField('dct_issued_s', 'dct_issued_s')
  renameField('solr_year_i', 'gbl_indexYear_im')
  setDateRange()
  renameField('dct_spatial_sm', 'dct_spatial_sm')
  renameField('solr_geom', 'locn_geometry')
  renameField('solr_geom', 'dcat_bbox')
  renameField('', 'dcat_centroid')
  renameField('', 'dct_relation_sm')
  renameField('', 'pcdm_memberOf_sm')
  renameField('', 'dct_isPartOf_sm')
  renameField('dc_source_sm', 'dct_source_sm')
  renameField('', 'dct_isVersionOf_sm')
  renameField('', 'dct_replaces_sm')
  renameField('', 'dct_isReplacedBy_sm')
  renameField('', 'dct_rights_sm')
  renameField('', 'dct_rightsHolder_sm')
  renameField('', 'dct_license_sm')
  renameField('dc_rights_s', 'dct_accessRights_s')
  renameField('dc_format_s', 'dct_format_s')
  renameField('cugir_filesize_s', 'gbl_fileSize_s')
  renameField('layer_id_s', 'gbl_wxsIdentifier_s')
  renameField('dct_references_s', 'dct_references_s')
  renameField('layer_slug_s', 'id')
  renameField('dc_identifier_s', 'dct_identifier_sm')
  renameField('layer_modified_dt', 'gbl_mdModified_dt')
  setVersion()
  renameField('suppressed_b', 'gbl_suppressed_b')
  renameField('', 'gbl_georeferenced_b')
  copyExtraFields()
  checkMultiValues()
  return r2
}
