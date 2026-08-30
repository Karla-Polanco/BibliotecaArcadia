import zipfile
import io
import os

epub_bytes = io.BytesIO()
with zipfile.ZipFile(epub_bytes, 'w', zipfile.ZIP_DEFLATED) as z:
    z.writestr('mimetype', 'application/epub+zip', compress_type=zipfile.ZIP_STORED)
    
    container_xml = '''<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
    <rootfiles>
        <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
    </rootfiles>
</container>'''
    z.writestr('META-INF/container.xml', container_xml)
    
    content_opf = '''<?xml version="1.0" encoding="UTF-8"?>
<package xmlns="http://www.idpf.org/2007/opf" unique-identifier="BookId" version="3.0">
    <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
        <dc:title>Libro de Prueba Arcadia</dc:title>
        <dc:creator>Arquitecto de Software</dc:creator>
        <dc:language>es</dc:language>
        <dc:description>Un libro EPUB de prueba generado para validar la persistencia.</dc:description>
    </metadata>
    <manifest>
        <item id="chapter1" href="chapter1.xhtml" media-type="application/xhtml+xml"/>
    </manifest>
    <spine>
        <itemref idref="chapter1"/>
    </spine>
</package>'''
    z.writestr('OEBPS/content.opf', content_opf)
    
    chapter1 = '''<?xml version="1.0" encoding="UTF-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head><title>Capítulo 1</title></head>
<body><h1>Capítulo 1</h1><p>Biblioteca Arcadia funciona sin conexión con IndexedDB.</p></body>
</html>'''
    z.writestr('OEBPS/chapter1.xhtml', chapter1)

os.makedirs('scratch', exist_ok=True)
with open('scratch/test_book.epub', 'wb') as f:
    f.write(epub_bytes.getvalue())

print('Created scratch/test_book.epub successfully, size:', len(epub_bytes.getvalue()), 'bytes')
