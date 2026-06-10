import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { cargarEntorno } from '../../../../config/entorno';
import { AdaptadorFuenteCatalogo, ProductoFuente } from '../adaptador-fuente-catalogo';
import { parsearCsvCatalogo } from './parser-csv';

/**
 * Adaptador de catálogo por archivo CSV (fuente por defecto del MVP).
 *
 * Hoy lee de una ruta local configurable (CATALOGO_CSV_RUTA). En el
 * piloto, esa ruta será el directorio donde el SFTP del súper deposita
 * el archivo diario.
 * // TODO: integración real (SFTP) — descargar el archivo vía sftp
 * //       antes de parsear, con credenciales por tenant.
 */
@Injectable()
export class AdaptadorCsv implements AdaptadorFuenteCatalogo {
  readonly fuente = 'CSV_SFTP';
  private readonly logger = new Logger('AdaptadorCsv');

  async obtenerProductos(tenantId: string): Promise<ProductoFuente[]> {
    const ruta = this.resolverRuta();
    this.logger.log(`Leyendo catálogo para tenant ${tenantId} desde ${ruta}`);

    const contenido = await fs.readFile(ruta, 'utf8');
    const { productos, errores } = parsearCsvCatalogo(contenido);
    for (const error of errores) {
      this.logger.warn(`CSV: ${error}`);
    }
    if (productos.length === 0 && errores.length > 0) {
      throw new Error(`El CSV no produjo ningún producto válido: ${errores[0]}`);
    }
    return productos;
  }

  /** La ruta del CSV puede ser absoluta o relativa a la raíz del backend. */
  private resolverRuta(): string {
    const configurada = cargarEntorno().CATALOGO_CSV_RUTA;
    return path.isAbsolute(configurada)
      ? configurada
      : path.resolve(process.cwd(), configurada);
  }
}
