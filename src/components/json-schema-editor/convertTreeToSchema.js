function clone(source) {
  return JSON.parse(JSON.stringify(source))
}

function convertTypeToSchema(node) {
  let schema = clone(node.value)
  if (node.children && node.children.length > 0) {
    schema.enum = clone(node.children[0].value)
  }
  return schema
}

function convertObjectToSchema(node) {
  let schema = clone(node.value)
  node.children.forEach(child => {
    switch (child.type) {
      case 'properties':
        schema.properties = convertPropertiesToSchema(child)
        break
      case 'required':
        schema.required = clone(child.value)
        break
      case 'dependencies':
        schema.dependencies = convertDependenciesToSchema(child)
        break
      case 'enum':
        schema.enum = clone(child.value.enum)
        break
    }
  })
  return schema
}

function commonConverByType(child, callback) {
  const plainObject = {}
  let schema = plainObject
  switch (child.type) {
    case 'jsonSchema':
      schema = convertTreeToSchema(child)
      break
    case 'string':
    case 'integer':
    case 'number':
    case 'boolean':
    case 'null':
    case 'enum':
    case 'ref': // 注意
      schema = convertTypeToSchema(child)
      break
    case 'object':
      schema = convertObjectToSchema(child)
      break
    case 'array':
      schema = convertArrayToSchema(child)
      break
    case 'allOf':
    case 'anyOf':
    case 'oneOf':
    case 'not':
      schema = convertOptionToSchema(child)
      break
  }

  if (schema !== plainObject) {
    callback(schema)
  }
}

function convertArrayToSchema(node) {
  let schema = clone(node.value)
  if (node.children.length > 0) {
    let child = node.children[0]
    commonConverByType(child, info => {
      schema.items = info
    })

    if (child.type === 'items') {
      schema.items = convertItemsToSchema(child)
    }
  }
  return schema
}

function convertPropertiesToSchema(node) {
  let schema = {}
  node.children.forEach(child => {
    commonConverByType(child, info => {
      schema[child.name] = info
    })
  })
  return schema
}

function convertDependenciesToSchema(node) {
  let schema = {}
  node.children.forEach(child => {
    schema[child.name] = clone(child.value)
  })
  return schema
}

function convertItemsToSchema(node) {
  let schema = []
  node.children.forEach(child => {
    commonConverByType(child, info => {
      schema.push(info)
    })
  })
  return schema
}

function convertOptionToSchema(node) {
  let schema = {}
  schema[node.type] = []
  let list = schema[node.type]
  node.children.forEach(child => {
    commonConverByType(child, info => {
      list.push(info)
    })
  })
  return schema
}

function convertDefinitionsToSchema(node) {
  let schema = {}
  node.children.forEach(child => {
    schema[child.name] = commonConverByType(child, info => {
      schema[child.name] = info
    })
  })
  return schema
}

export function convertTreeToSchema(tree) {
  let schema = {}
  let definitions
  tree.children.forEach(child => {
    // 原本没有  ref 时的处理, 这个要注意
    commonConverByType(child, info => {
      schema = info
    })

    if (child.type === 'definitions') {
      definitions = convertDefinitionsToSchema(child)
    }
  })

  if (!tree.parent) schema.title = tree.name
  if (tree.value.description) schema.description = tree.value.description
  if (definitions) schema.definitions = definitions
  return schema
}

export default convertTreeToSchema
